package main

import (
//    "context"
    "net/http"
//    "encoding/json"
    "fmt"

//     "github.com/aws/aws-lambda-go/events"
//     "github.com/aws/aws-lambda-go/lambda"
)

type HttpResponse struct {
    StatusCode int    `json:"StatusCode"`
    Body       string `json:"Body"`
}

func RegisterApiKeyHandler(w http.ResponseWriter, r *http.Request) {
//    b, _ := json.Marshal(HttpResponse{200, "OK"})
    b := HttpResponse{200, "OK"}
    fmt.Fprint(w, b)
}

