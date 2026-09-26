# Gold data is provided at runtime by mounting it at ECON_DATA_ROOT (the kind
# e2e mounts a fixture ConfigMap at /data/gold — see tests/e2e/).

FROM node:22 AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.24 AS build
WORKDIR /src/go
COPY go/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/serving ./cmd/serving

FROM gcr.io/distroless/static-debian12:nonroot
ENV ECON_ADDR=:8080 \
    ECON_DATA_ROOT=/data \
    ECON_WEB_DIR=/app/web-dist
COPY --from=build /out/serving /app/serving
COPY --from=web /src/web/dist /app/web-dist
EXPOSE 8080
ENTRYPOINT ["/app/serving"]
