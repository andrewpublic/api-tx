package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

func reqFromUser(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	var b BankApiKey
	err := json.NewDecoder(r.Body).Decode(&b)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	// newTx := json.Marshal(&)
	// newTx := Tx{getTxUpBank(b)}

	tx := []TxMapped{}
	tmpTx := Tx{}

	url := ""

	// TODO: Remove this out of loop first iteration
	tmpTx = getTxUpBank(b, url)
	mappedTx := mapTx(tmpTx)
	url = mappedTx[0].Next

	tx = append(tx, mappedTx...)

	for url != "" {
		tmpTx = getTxUpBank(b, url)
		mappedTx = mapTx(tmpTx)
		url = mappedTx[0].Next

		tx = append(tx, mappedTx...)

	}

	// tx := getTxMock(b)
	// cache[b] = tx

	// log.Printf("Cache has %d records.", len(cache))

	// txM := mapTx(tx)

	log.Println(strconv.Itoa(len(tx)))

	convertToCsv(mapTxToStringSlice(tx))

	// var jsonData any

	uploadToS3(tx)

	// TODO: remove returning this json - instead just send simple message
	json.NewEncoder(w).Encode(tx)
}
