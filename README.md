# insek

## Install dependencies:
	npm i

## Running locally
	> ./start.sh

## Authorization for shell    
chmod +x start-stg.sh or ... shell 

## Create token tip !
openssl ecparam -genkey -name prime256v1 -noout -out private.key

## create public key from private key 
openssl ec -in ./jwt-cret/jwt.private.key -pubout -out public.key

## jion slack 
https://join.slack.com/t/slack-sxc1565/shared_invite/zt-2onzym280-GiCKd2A7fDLuFgMODCGmvQ