// For encrypted queries
const requireESM = require('esm')(module);
const fs = require('fs');
const { Universal, Node, MemoryAccount, ContractACI } = require('@aeternity/aepp-sdk');
const { decodeEvents, SOPHIA_TYPES } = requireESM('@aeternity/aepp-sdk/es/contract/aci/transformation');
const OracleContractCode = fs.readFileSync(__dirname + '/../contracts/OracleConnector.aes', 'utf-8');

const contract_address = ""
var blake2b = require('blake2b')
var axios = require('axios')
var url = ""
var processedIndex = 0
var Compilerurl = ""
const BigNumber = require('bignumber.js');
const conf = require('./conf.json')
require('dotenv').config()
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.SECRET_KEY);

const keyPair = {
  "publicKey": "",
  "secretKey": ""
}
var client_node = null
var contract = null


var queries = null;

async function initNode () {
  client_node = await Universal({
    nodes: [
      {
        name: 'node',
        instance: await Node({
          url: url,
          internalUrl: url,
        }),

      }],
    accounts: [MemoryAccount({ keypair: keyPair })],
    compilerUrl: ""
  });

  contract = await client_node.getContractInstance(OracleContractCode, { contractAddress: contract_address })
  contract = await client_node.getContractInstance(OracleContractCode, { contractAddress: contract_address })

  let getNumberOfQueries = await contract.methods.getIndexOfQueries()
  queries = getNumberOfQueries.decodedResult


  StartListening()
}
initNode()

async function StartListening () {
  async function getQueries () {
    try {
      var getNumberOfQueries = await contract.methods.getIndexOfQueries() // starting form 0
      var _getNumberOfQueries = getNumberOfQueries.decodedResult
    } catch (err) {
      console.log(err)
      getQueries()
    }
    if (_getNumberOfQueries > queries) {
      for (let index = queries + 1; index <= _getNumberOfQueries; index++) {
        console.log(index + " ===> ")

        let getQuery = await contract.methods.getQueryByNumber(index)
        let _getQuery = getQuery.decodedResult
        console.log("getQuery: " + _getQuery)

        let getQueryQuestion = await contract.methods.getQuestionByQuery(_getQuery)
        let _getQueryQuestion = getQueryQuestion.decodedResult
        console.log("getQueryQuestion: " + _getQueryQuestion)
        try {
          var _decrypted_query_question = cryptr.decrypt(_getQueryQuestion);
        }
        catch (err) {
          console.log("ERR ===")
          console.log(err)
          console.log("ERR END ===")
          _decrypted_query_question = "ERR:ENCRYPTION"
        }

        let result = await getResult(_decrypted_query_question)
        console.log("result " + result)

        let respondToQuery = await contract.methods.respond(_getQuery, result.toString())
        let _respondToQuery = respondToQuery.decodedResult
        console.log("respondToQuery: " + _respondToQuery)



        queries++
      }
    }
    getQueries()
  }
  getQueries()
}

async function getResult (_args) {
  let args = _args.split(',')
  var response = null
  try {
    response = await axios.get(args[0])
  }
  catch (err) {
    console.log("ERR ========")
    console.log(err.message)
    console.log("ERR END ========")
    return "ERR:URL"
  }

  var result = response.data
  for (let index = 1; index < args.length; index++) {
    result = result[args[index]]
  }
  console.log("result: " + result)
  return result
}