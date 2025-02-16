package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"github.com/aws/aws-lambda-go/events"
)

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyRequest, error) {
	formData, err := url.ParseQuery(request.Body)

	if err != nil {
		log.Printf("Error parsing form data: %s", err)
		return events.APIGatewayProxyRequest{StatusCode: 400}, err
	}

	key1 := formData.Get("key1")
	key2 := formData.Get("key2")

	log.Printf("Received Key1: %s", key1)
	log.Printf("Received Key2: %s", key2)

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       fmt.Sprintf(`%s, %s`, key1, key2),
	}, nil
}

func main() {
	loadEnv()

	router := loadRoutes()

	log.Fatal(http.ListenAndServe(":8080", router))
}

func postInfo(w http.ResponseWriter, r *http.Request) {
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

// func createUser(w http.ResponseWriter, r *http.Request) {
// 	var newUser User
// 	_ = json.NewDecoder(r.Body).Decode(&newUser)
// 	users = append(users, newUser)
// 	json.NewEncoder(w).Encode(newUser)
// }

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
}

func mapTx(tx Tx) []TxMapped {
	txMapped := []TxMapped{}
	for _, t := range tx.Data {
		txMapped = append(txMapped, TxMapped{
			Time:     t.Attributes.CreatedAt.Unix(),
			Cost:     t.Attributes.Amount.Value,
			Details:  t.Attributes.Description,
			Category: t.Relationships.Category.Data.Id,
			Next:     tx.Links.Next,
		})
	}

	return txMapped
}
