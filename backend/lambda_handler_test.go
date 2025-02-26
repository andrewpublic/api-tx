package main

import (
    "testing"
    "fmt"
    "net/http"
    "net/http/httptest"
)

func TestPostRegister(t *testing.T) {
    tests := []struct {
        name             string
        recorder         *httptest.ResponseRecorder
        request          *http.Request
        expectedResponse string
        expectedHeader   string
    }{
        {
            name:           "OK",
            recorder:       httptest.NewRecorder(),
            request:        httptest.NewRequest("POST", "/register", nil),
            expectedResponse: fmt.Sprintf("%s\n", `{"StatusCode":200,"Body":"OK"}`),
        },
    }

    for _, test := range tests {
        t.Run(test.name, func(t *testing.T) {
            request := test.request
            response := test.recorder

            handler := http.HandlerFunc(RegisterApiKeyHandler)

            handler.ServeHTTP(response, request)

            got := response.Body.String()
            want := test.expectedResponse

            // in golang json is stored as byte[] not string
            // so we have to cast as string
            if got != want {
                t.Errorf("got %v, want %v", got, string(want))
            }
        })
    }
}

