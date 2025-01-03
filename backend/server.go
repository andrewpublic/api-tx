package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

type TxMapped struct {
	Time     int64
	Cost     string
	Details  string
	Category string
	Next     string
}

type Tx struct {
	Data []struct {
		Attributes struct {
			Description string    `json:"description"`
			CreatedAt   time.Time `json:"createdAt"`
			Amount      struct {
				CurrencyCode     string `json:"currencyCode"`
				Value            string `json:"value"`
				ValueInBaseUnits int    `json:"valueInBaseUnits"`
			}
		}
		Relationships struct {
			Category struct {
				Data struct {
					Id string `json:"id"`
				}
			}
		}
	}
	Links struct {
		Next string `json:"next"`
	}
}

type TxLong struct {
	Data []struct {
		Type       string `json:"type"`
		ID         string `json:"id"`
		Attributes struct {
			Status          string `json:"status"`
			RawText         any    `json:"rawText"`
			Description     string `json:"description"`
			Message         string `json:"message"`
			IsCategorizable bool   `json:"isCategorizable"`
			HoldInfo        any    `json:"holdInfo"`
			RoundUp         any    `json:"roundUp"`
			Cashback        any    `json:"cashback"`
			Amount          struct {
				CurrencyCode     string `json:"currencyCode"`
				Value            string `json:"value"`
				ValueInBaseUnits int    `json:"valueInBaseUnits"`
			} `json:"amount"`
			ForeignAmount      any       `json:"foreignAmount"`
			CardPurchaseMethod any       `json:"cardPurchaseMethod"`
			SettledAt          time.Time `json:"settledAt"`
			CreatedAt          time.Time `json:"createdAt"`
			TransactionType    any       `json:"transactionType"`
			Note               any       `json:"note"`
			PerformingCustomer struct {
				DisplayName string `json:"displayName"`
			} `json:"performingCustomer"`
			DeepLinkURL string `json:"deepLinkURL"`
		} `json:"attributes"`
		Relationships struct {
			Account struct {
				Data struct {
					Type string `json:"type"`
					ID   string `json:"id"`
				} `json:"data"`
				Links struct {
					Related string `json:"related"`
				} `json:"links"`
			} `json:"account"`
			TransferAccount struct {
				Data any `json:"data"`
			} `json:"transferAccount"`
			Category struct {
				Data  any `json:"data"`
				Links struct {
					Self string `json:"self"`
				} `json:"links"`
			} `json:"category"`
			ParentCategory struct {
				Data any `json:"data"`
			} `json:"parentCategory"`
			Tags struct {
				Data []struct {
					Type string `json:"type"`
					ID   string `json:"id"`
				} `json:"data"`
				Links struct {
					Self string `json:"self"`
				} `json:"links"`
			} `json:"tags"`
			Attachment struct {
				Data any `json:"data"`
			} `json:"attachment"`
		} `json:"relationships"`
		Links struct {
			Self string `json:"self"`
		} `json:"links"`
	} `json:"data"`
	Links struct {
		Prev any `json:"prev"`
		Next any `json:"next"`
	} `json:"links"`
}

type BankApiKey struct {
	BankApiKey string `json:"bankApiKey"`
}

// var txList []Tx
var cache map[BankApiKey]Tx

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading env file")
	}

	if os.Getenv("AWS_ACCESS_KEY_ID") == "" || os.Getenv("AWS_SECRET_ACCESS_KEY") == "" {
		log.Fatal("Missing AWS Access Environment Variables")
	}

	cache = map[BankApiKey]Tx{}

	router := mux.NewRouter()
	// outer.HandleFunc("/", getInfo).Methods("GET")
	router.HandleFunc("/", postInfo).Methods("POST")

	log.Fatal(http.ListenAndServe(":8080", router))
}

// func getInfo(w http.ResponseWriter, r *http.Request) {
// 	enableCors(&w)

// 	json.NewEncoder(w).Encode(tx)
// }

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
