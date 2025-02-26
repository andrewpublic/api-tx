package main

import (
//    "context"
    "fmt"
    "net/http"
    "log"
    "encoding/json"
    "os"

//     "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    "github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

type HttpResponse struct {
    StatusCode int    `json:"StatusCode"`
    Body       string `json:"Body"`
}

type RegisterRequestBody struct {
    ApiKey string `json:"ApiKey"`
}

func (a *RegisterRequestBody) validate() error {
    if len(a.ApiKey) < 10 {
        return fmt.Errorf("ApiKey too short")
    }
    return nil
}

func RegisterApiKeyHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
        return
    }

    requestBody := &RegisterRequestBody{}

    defer r.Body.Close()
    // one liner
    // if err := json.NewDecoder(r.Body).Decode(requestBody); err != nil {
    err := json.NewDecoder(r.Body).Decode(requestBody);
    if err != nil {
        http.Error(w, "Request contained unexpected json data", http.StatusBadRequest)
        return
    }

    err = requestBody.validate()
    if err != nil {
        http.Error(w, fmt.Sprint(err), http.StatusBadRequest)
        return
    }

    response := HttpResponse{200, "OK"}
    json.NewEncoder(w).Encode(response)
}

func main() {
    http.HandleFunc("/register", RegisterApiKeyHandler)

    if runtime, _ := os.LookupEnv("IS_RUNTIME_LAMBDA"); runtime == "true" {
        log.Println("Starting serverless environment...")
        lambda.Start(httpadapter.New(http.DefaultServeMux).ProxyWithContext)
    } else {
        log.Println("Starting serverful environment, listening...")
        err := http.ListenAndServe(":3333", nil)
        if err != nil {
            log.Panic(err)
        }
    }
}

