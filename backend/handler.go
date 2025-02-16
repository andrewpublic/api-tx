package main

import "fmt"

func Hello(name ...string) (string, error) {
    if len(name) > 1 {
        return "", fmt.Errorf("too many arguments in variadic function")
    }

    if len(name) == 0 {
        return "Hello, world!", nil
    }

    return fmt.Sprintf("Hello, %s!", name[0]), nil
}

func main() {
    fmt.Println(Hello())
}

//func handler(ctx context.Context, request events.APIGatewayProxyRequest)

