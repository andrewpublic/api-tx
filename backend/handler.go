package main

import "fmt"

func Hello() string {
    return "Hello, world"
}

func main() {
    fmt.Println(Hello())
}

//func handler(ctx context.Context, request events.APIGatewayProxyRequest)

