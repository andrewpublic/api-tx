package main

import (
    "testing"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "fmt"
)

func TestPostRegister(t *testing.T) {
    tests := []struct {
        name             string
        recorder         *httptest.ResponseRecorder
        request          *http.Request
        expectedResponse HttpResponse
        expectedHeader   string
    }{
        {
            name:           "OK",
            recorder:       httptest.NewRecorder(),
            request:        httptest.NewRequest("POST", "/register", nil),
            expectedResponse: HttpResponse{200, "OK"},
        },
    }

    for _, test := range tests {
        t.Run(test.name, func(t *testing.T) {
            request := test.request
            response := test.recorder

            handler := http.HandlerFunc(RegisterApiKeyHandler)

            handler.ServeHTTP(response, request)

            got := response.Body.String()

            httpResponse := HttpResponse{200, "OK"}

            want, err := json.Marshal(httpResponse)
            if err != nil {
                t.Fatalf("Failed to marshal: %v", err)
            }

            // in golang json is stored as byte[] not string
            // so we have to cast as string
            if got != string(want) {
                t.Errorf("got %v, want %v", got, string(want))
            }
        })
    }
}

