package main

import (
//    "context"
    "net/http"
    "log"
    "encoding/json"

//     "github.com/aws/aws-lambda-go/events"
//     "github.com/aws/aws-lambda-go/lambda"
)

type HttpResponse struct {
    StatusCode int    `json:"StatusCode"`
    Body       string `json:"Body"`
}

func RegisterApiKeyHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
        return
    }

    response := HttpResponse{200, "OK"}
    json.NewEncoder(w).Encode(response)
}

func main() {
    http.HandleFunc("/register", RegisterApiKeyHandler)

    err := http.ListenAndServe(":3333", nil)
    if err != nil {
        log.Panic(err)
    }
}

