// To be generalised
package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

// Gets transactions from Up Bank
func getTxUpBank(apiKey BankApiKey, url string) Tx {
	if url == "" {
		url = "https://api.up.com.au/api/v1/transactions"
	}

	bearer := "Bearer " + apiKey.BankApiKey

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Fatalln(err)
	}

	req.Header.Add("Authorization", bearer)

	// Add query params
	queryParams := req.URL.Query()
	queryParams.Add("page[size]", "100") // 100 is max page size
	req.URL.RawQuery = queryParams.Encode()

	client := &http.Client{}

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalln(err)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalln(err)
	}

	log.Print(body)

	var tx Tx
	newErr := json.Unmarshal(body, &tx)
	if newErr != nil {
		log.Fatalln(err)
	}

	log.Print(tx)

	return tx
}
