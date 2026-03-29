FROM golang@sha256:2389ebfa5b7f43eeafbd6be0c3700cc46690ef842ad962f6c5bd6be49ed82039 AS builder

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

FROM alpine@sha256:c3f8e73fdb79deaebaa2037150150191b9dcbfba68b4a46d70103204c53f4709 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /opt/bin

COPY --from=builder /go/src/app/checker-server /opt/bin/checker-server

ENV TZ=UTC
ENV GIN_MODE=release

CMD [ "/opt/bin/checker-server" ]
