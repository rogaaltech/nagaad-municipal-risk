#!/usr/bin/env python3
"""Clip Beledweyne layers, compute flood exposure, write GeoJSON / summary / PMTiles."""

from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely import make_valid
from shapely.ops import transform, unary_union

RAW = Path(os.environ.get("RAW_DATA", "/data/raw"))
OUT = Path(os.environ.get("OUT_DATA", "/data/out"))
CITY_URBAN = os.environ.get("CITY_URBAN", "Belet Weyne")
CITY_LABEL = os.environ.get("CITY_LABEL", "Beledweyne")
UTM = "EPSG:32638"
WGS84 = "EPSG:4326"


def log(msg: str) -> None:
    print(msg, flush=True)


def read_vector(path: Path, **kwargs):
    if not path.exists():
        raise FileNotFoundError(path)
    gdf = gpd.read_file(path, **kwargs)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    return gdf.to_crs(4326)


def first_col(gdf: gpd.GeoDataFrame, names: list[str]) -> str | None:
    lower = {c.lower(): c for c in gdf.columns}
    for name in names:
        if name.lower() in lower:
            return lower[name.lower()]
    return None


def _drop_z_geom(geom):
    if geom is None or geom.is_empty:
        return geom
    if getattr(geom, "has_z", False):
        return transform(lambda *args: args[:2], geom)
    return geom


def drop_z(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    gdf = gdf.copy()
    gdf["geometry"] = gdf.geometry.map(_drop_z_geom)
    return gdf


def mark_in_flood(gdf: gpd.GeoDataFrame, flood: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    gdf = gdf.copy()
    if flood.empty:
        gdf["inFlood"] = 0
        return gdf
    joined = gpd.sjoin(gdf[["geometry"]], flood[["geometry"]], how="left", predicate="intersects")
    hits = joined.loc[joined["index_right"].notna()].index.unique()
    gdf["inFlood"] = gdf.index.isin(hits).astype(int)
    return gdf


def write_geojson(gdf: gpd.GeoDataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = drop_z(gdf)
    # keep JSON small: drop index
    out.to_file(path, driver="GeoJSON")
    log(f"  wrote {path.name} ({len(out)} features)")


def tippecanoe(src: Path, dest: Path, layer: str, extra: list[str]) -> None:
    dest.unlink(missing_ok=True)
    cmd = [
        "tippecanoe",
        "-o",
        str(dest),
        "-l",
        layer,
        "--force",
        *extra,
        str(src),
    ]
    log("  " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    log(f"RAW={RAW}")
    log(f"OUT={OUT}")
    log(f"city urbanName={CITY_URBAN}")

    polys = read_vector(RAW / "raw_data" / "SURPII_city_polygons" / "SURPII_city_polygons.shp")
    name_col = first_col(polys, ["UrbanName", "urbanName"])
    if not name_col:
        raise RuntimeError(f"UrbanName column missing: {list(polys.columns)}")
    boundary = polys[polys[name_col].astype(str).str.strip() == CITY_URBAN].copy()
    if boundary.empty:
        raise RuntimeError(f"No polygon for {CITY_URBAN}")
    boundary["geometry"] = boundary.geometry.map(make_valid)
    city_geom = unary_union(boundary.geometry.values)
    city_gdf = gpd.GeoDataFrame(geometry=[city_geom], crs=4326)
    write_geojson(boundary[["geometry"]].assign(name=CITY_LABEL), OUT / "boundary.geojson")

    flood_path = (
        RAW / "raw_data" / "som_floods" / "flood_historical" / "flood_extent_historical_dissolved.shp"
    )
    log("Clipping flood extent…")
    flood = read_vector(flood_path)
    flood["geometry"] = flood.geometry.map(make_valid)
    flood = gpd.clip(flood, city_gdf)
    flood["geometry"] = flood.geometry.simplify(0.00015, preserve_topology=True)
    flood = flood[~flood.geometry.is_empty]
    if flood.empty:
        log("WARNING: flood clip is empty")
        flood = gpd.GeoDataFrame(geometry=[], crs=4326)
    else:
        flood = gpd.GeoDataFrame(geometry=[unary_union(flood.geometry.values)], crs=4326)
        flood["inFlood"] = 1
    flood_geo = OUT / "flood.geojson"
    write_geojson(flood, flood_geo)

    flood_area_ha = 0.0
    if not flood.empty:
        flood_area_ha = float(flood.to_crs(UTM).geometry.area.sum() / 10_000)

    log("Clipping river…")
    river = read_vector(RAW / "raw_data" / "som_rivers" / "SOM_Rivers_Juba_shabelle.shp")
    river = gpd.clip(river, city_gdf)
    keep = [c for c in river.columns if c.lower() in {"name", "code", "class", "geometry"}]
    write_geojson(river[keep] if keep else river, OUT / "river.geojson")

    log("Clipping conflict events…")
    conflict = read_vector(RAW / "raw_data" / "som_conflicts" / "SURPII_city_insurgency.shp")
    conflict = gpd.clip(conflict, city_gdf)
    rename = {
        first_col(conflict, ["event_type"]) or "event_type": "event_type",
        first_col(conflict, ["event_date"]) or "event_date": "event_date",
        first_col(conflict, ["location"]) or "location": "location",
        first_col(conflict, ["fatalities"]) or "fatalities": "fatalities",
        first_col(conflict, ["year"]) or "year": "year",
        first_col(conflict, ["notes"]) or "notes": "notes",
    }
    existing = {k: v for k, v in rename.items() if k in conflict.columns}
    conflict = conflict.rename(columns=existing)
    cols = [c for c in ["event_type", "event_date", "year", "location", "fatalities", "notes", "geometry"] if c in conflict.columns]
    if "notes" in conflict.columns:
        conflict["notes"] = conflict["notes"].astype(str).str.slice(0, 240)
    write_geojson(conflict[cols], OUT / "conflict.geojson")

    log("IDP sites…")
    idp_path = RAW / "decisionMaking_data" / "belet_weyne_idps_flood_exposure.geojson"
    if idp_path.exists():
        idps = read_vector(idp_path)
    else:
        idps = read_vector(RAW / "raw_data" / "som_idp" / "SURPII_city_idps.shp")
        ucol = first_col(idps, ["UrbanName"])
        if ucol:
            idps = idps[idps[ucol].astype(str).str.strip() == CITY_URBAN]
    idps["geometry"] = idps.geometry.map(make_valid)
    idps = mark_in_flood(idps, flood)
    write_geojson(idps, OUT / "idps.geojson")

    log("Buildings + flood join…")
    buildings = read_vector(
        RAW / "raw_data" / "som_buildings" / "buildings_beledweyne" / "Buildingfootprint_Beledweyne.shp"
    )
    buildings["geometry"] = buildings.geometry.map(make_valid)
    area_col = first_col(buildings, ["area_in_me", "areaM2"])
    conf_col = first_col(buildings, ["confidence"])
    buildings = mark_in_flood(buildings, flood)
    out_b = gpd.GeoDataFrame(
        {
            "areaM2": buildings[area_col] if area_col else None,
            "confidence": buildings[conf_col] if conf_col else None,
            "inFlood": buildings["inFlood"].astype(int),
            "geometry": buildings.geometry,
        },
        crs=4326,
    )
    b_geo = OUT / "buildings.geojson"
    write_geojson(out_b, b_geo)

    log("Roads + flood join…")
    roads_geojson = RAW / "decisionMaking_data" / "belet_weyne_roads_flood_exposure.geojson"
    if roads_geojson.exists():
        roads = read_vector(roads_geojson)
    else:
        roads = read_vector(RAW / "raw_data" / "som_roads" / "SURPII_city_roads.shp")
        roads = gpd.clip(roads, city_gdf)
    roads["geometry"] = roads.geometry.map(make_valid)
    hw = first_col(roads, ["highway"])
    nm = first_col(roads, ["name"])
    roads_utm = roads.to_crs(UTM)
    length_m = roads_utm.geometry.length.to_numpy()
    roads = mark_in_flood(roads, flood)
    if not flood.empty:
        flooded_parts = gpd.overlay(roads, flood, how="intersection", keep_geom_type=True)
        roads_km_flood = (
            float(flooded_parts.to_crs(UTM).geometry.length.sum() / 1000) if not flooded_parts.empty else 0.0
        )
    else:
        roads_km_flood = 0.0
    out_r = gpd.GeoDataFrame(
        {
            "highway": roads[hw] if hw else None,
            "name": roads[nm] if nm else None,
            "lengthM": length_m,
            "inFlood": roads["inFlood"].astype(int),
            "geometry": roads.geometry,
        },
        crs=4326,
    )
    r_geo = OUT / "roads.geojson"
    write_geojson(out_r, r_geo)

    def col_num(gdf, names):
        col = first_col(gdf, names)
        if not col:
            return pd.Series(0, index=gdf.index)
        return pd.to_numeric(gdf[col], errors="coerce").fillna(0)

    idp_ind = col_num(idps, ["idpIndividuals", "IDP_Ind"])
    idp_hh = col_num(idps, ["idpHouseholds", "IDP_HHs"])
    in_f = pd.to_numeric(idps["inFlood"], errors="coerce").fillna(0).astype(int)

    summary = {
        "city": CITY_LABEL,
        "urbanName": CITY_URBAN,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "buildingsTotal": int(len(out_b)),
        "buildingsInFlood": int((out_b["inFlood"] == 1).sum()),
        "idpSitesTotal": int(len(idps)),
        "idpSitesInFlood": int((in_f == 1).sum()),
        "idpIndividualsTotal": float(idp_ind.sum()),
        "idpIndividualsInFlood": float(idp_ind[in_f == 1].sum()),
        "idpHouseholdsInFlood": float(idp_hh[in_f == 1].sum()),
        "roadsKmTotal": float(length_m.sum() / 1000),
        "roadsKmInFlood": roads_km_flood,
        "conflictEvents": int(len(conflict)),
        "floodAreaHa": flood_area_ha,
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    log(f"summary: {json.dumps(summary)}")

    log("Building PMTiles…")
    tippecanoe(
        flood_geo,
        OUT / "flood.pmtiles",
        "flood",
        ["-zg", "--no-feature-limit", "--no-tile-size-limit"],
    )
    tippecanoe(
        b_geo,
        OUT / "buildings.pmtiles",
        "buildings",
        ["-Z12", "-z16", "--drop-densest-as-needed", "--extend-zooms-if-still-dropping"],
    )
    tippecanoe(
        r_geo,
        OUT / "roads.pmtiles",
        "roads",
        ["-Z10", "-z16", "--drop-densest-as-needed"],
    )

    # GeoJSON for buildings/roads/flood is only an ETL intermediate.
    for temp in (b_geo, r_geo, flood_geo):
        temp.unlink(missing_ok=True)
        log(f"  removed intermediate {temp.name}")

    inv = OUT / "investments.csv"
    if not inv.exists():
        inv.write_text("name,type,status,lat,lng,cost\n", encoding="utf-8")

    log("ETL complete.")


if __name__ == "__main__":
    main()
