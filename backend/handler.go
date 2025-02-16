package main

import (
//    "context"
    
//    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
)

type HttpResponse struct {
    StatusCode int
    Body       string
}

// func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
 //   return events.APIGatewayProxyResponse{
func handler() (HttpResponse, error) {
    return HttpResponse{
        StatusCode: 200,
        Body: `Hello World!`,
    }, nil
}

func main() {
    lambda.Start(handler)
}

