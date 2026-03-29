FROM golang@sha256:2389ebfa5b7f43eeafbd6be0c3700cc46690ef842ad962f6c5bd6be49ed82039

# Set the working directory
WORKDIR /app

# Copy go.mod and go.sum files (if they exist)
COPY go.mod ./

# Copy the source code
COPY . .

# Build the application
RUN go build -o main .

# Expose the port your app runs on
EXPOSE 8080

# Run the application
CMD ["./main"]
