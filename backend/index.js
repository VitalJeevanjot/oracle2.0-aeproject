// For encrypted queries
const requireESM = require('esm')(module);
const fs = require('fs');
const { Universal, Node, MemoryAccount, ContractACI } = require('@aeternity/aepp-sdk');
const { decodeEvents, SOPHIA_TYPES } = requireESM('@aeternity/aepp-sdk/es/contract/aci/transformation');
// query example: https://poloniex.com/public?command=returnTicker,BTC_BTS,id
// import { parseBigNumber, asBigNumber, isBigNumber, ceil } from '@aeternity/aepp-sdk/es/utils/bignumber'
const OracleContractCode = fs.readFileSync(__dirname + '/../contracts/OracleConnector.aes', 'utf-8');
// oracle_plain
const contract_address = "ct_m5jd61zwpXuzeRjJeYVfwpFv6YdQvPqgKSvQMTiP9ihNAG9c7"
var blake2b = require('blake2b')
var axios = require('axios')
var url = "https://mainnet.aeternity.io"
var processedIndex = 0
var Compilerurl = "https://latest.compiler.aepps.com"
const BigNumber = require('bignumber.js');
const conf = require('./conf.json')


require('dotenv').config()

const keyPair = { // SUPER SECRET, CREATE ENV BEFORE SENDING TO GITHUB... BY JEEVANJOT
  "publicKey": process.env.PUBLIC_KEY,
  "secretKey": process.env.PRIVATE_KEY
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
    compilerUrl: "https://latest.compiler.aepps.com"
  });

  contract = await client_node.getContractInstance(OracleContractCode, { contractAddress: contract_address })
  // contract = await client_node.getContractInstance(OracleContractCode, { contractAddress: contract_address })

  let getNumberOfQueries = await contract.methods.getIndexOfQueries.get()
  queries = getNumberOfQueries.decodedResult

  console.log("Queries: " + queries)

  StartListening()
}
initNode()

async function StartListening () {
  async function getQueries () {
    try {
      var getNumberOfQueries = await contract.methods.getIndexOfQueries.get() // starting form 0
      var _getNumberOfQueries = getNumberOfQueries.decodedResult
      console.log("get Number Of Queries: " + _getNumberOfQueries)
    } catch (err) {
      console.log(err)
      getQueries()
    }

    if (_getNumberOfQueries > queries) {
      for (let index = queries + 1; index <= _getNumberOfQueries; index++) {
        console.log(index + " ===> ")

        let getQuery = await contract.methods.getQueryByNumber.get(index)
        let _getQuery = getQuery.decodedResult
        console.log("getQuery: " + _getQuery)

        let getQueryQuestion = await contract.methods.getQuestionByQuery.get(_getQuery)
        let _getQueryQuestion = getQueryQuestion.decodedResult
        console.log("getQueryQuestion: " + _getQueryQuestion)
        try {
          let result = await getResult(_getQueryQuestion)
          console.log("result " + result)
          let respondToQuery = await contract.methods.respond(_getQuery, result.toString())
          let _respondToQuery = respondToQuery.decodedResult
          console.log("respondToQuery: " + _respondToQuery)
        }
        catch(e) {
            console.log("_ErrorM Wrong Request Format by ==" + " : " + _getQueryQuestion )
            let respondToQuery = await contract.methods.respond(_getQuery, "Wrong Request Format!")
            let _respondToQuery = respondToQuery.decodedResult
            console.log("respondToQuery: " + _respondToQuery)
            console.log(e.message)
            console.log("/_ErrorM Wrong Request Format ===" + "\n\n")
        }



        queries++
      }
    }
    setTimeout(getQueries, 10000)
  }
  getQueries()
}
// 
async function getResult (_args) {
  console.log("_ARGS==")
  console.log(_args)
  console.log("/_ARGS===" + "\n\n")

  let args = _args.split(',')
  var response = null
  try {
    response = await axios.get(args[0])
  }
  catch (err) {
    console.log("ERR ========")
    console.log(err.message)
    console.log("/ERR ========" + "\n\n")
    return "ERR:URL"
  }

  var result = response.data

  for (let index = 1; index < args.length; index++) { // nested results
    try {
      
    if(args[index].includes("["))
    {
      let split_b = args[index].split("[")
      result = result[split_b[0]][split_b[1].charAt(0)]
    }
    else {
      result = result[args[index]]
    }
    
    }
    catch(e) {
      console.log("_err ========")
      console.log(e.message)
      console.log("/_err ========" + "\n\n")
    }
    console.log("===result===: " + index + ": " + args[index])
    console.log(result)
    console.log("/===result===: " + index + ": " + args[index] + "\n\n")
  }
  console.log("result: " + result)
  return result
}
// Testing...
// getResult("https://api.therocktrading.com/api/ticker/BTCEUR,result[0],volume")
// getResult("https://poloniex.com/public?command=returnTicker,BTC_BTS,id")
// getResult("hello")
// getResult("https://api.therocktrading.com/api/ticker/BTCEUR,result['hello'],volume")
