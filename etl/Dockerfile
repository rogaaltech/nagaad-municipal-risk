FROM python:3.12-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git sqlite3 libsqlite3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/felt/tippecanoe.git /tmp/tippecanoe \
    && make -C /tmp/tippecanoe -j"$(nproc)" \
    && make -C /tmp/tippecanoe install \
    && rm -rf /tmp/tippecanoe

RUN pip install --no-cache-dir geopandas pyogrio shapely pyproj pandas

COPY process.py /etl/process.py
WORKDIR /data
ENTRYPOINT ["python", "/etl/process.py"]
