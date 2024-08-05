#!/bin/bash
gcloud config set project insek-430609
gcloud auth activate-service-account \
--key-file=service-accounts/insek-app-engine.json
gcloud app deploy --appyaml=app.yaml --version=v1