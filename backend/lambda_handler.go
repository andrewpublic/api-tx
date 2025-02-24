package main

import (
//    "context"
    "net/http"
    "encoding/json"

//     "github.com/aws/aws-lambda-go/events"
//     "github.com/aws/aws-lambda-go/lambda"
)

type HttpResponse struct {
    StatusCode int    `json:"StatusCode"`
    Body       string `json:"Body"`
}

func RegisterApiKeyHandler(w http.ResponseWriter, r *http.Request) {
//    b, _ := json.Marshal(HttpResponse{200, "OK"})
    response := HttpResponse{200, "OK"}
    
//    fmt.Fprint(w, b)

    json.NewEncoder(w).Encode(response)
}

