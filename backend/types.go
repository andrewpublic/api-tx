package main

import "time"

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
