FROM golang:1.26-alpine as builder

WORKDIR /go/src/app
COPY ca/ca-bundle.crt /usr/local/share/ca-certificates/ca-bundle.crt

RUN apk update \
&& apk upgrade --available \
&& update-ca-certificates

RUN apk add --no-cache tzdata
ENV TZ=UTC

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

COPY go.* .
RUN go mod download

COPY . .
RUN go build -trimpath -ldflags "-s -w" -o checker-server ./cmd/server/main.go

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /opt/bin

COPY --from=builder /go/src/app/checker-server /opt/bin/checker-server

ENV TZ=UTC
ENV GIN_MODE=release

CMD [ "/opt/bin/checker-server" ]
