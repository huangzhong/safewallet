var BigNumber = require('bignumber.js'),
    resource = require('resource'),
    request = require('request'),
    prices = resource.define('prices');

prices.property('prices', 'object');
prices.description = "calculates estimated market prices of coins";
prices.timestamps();

prices.method('fetch', function (callback){
  var _prices = {};
  // Get BTC price
  request.get({ url: 'https://btc-e.com/api/2/btc_usd/trades', method: "GET" }, function (err, resp, body){
    var btcPrice = JSON.parse(body);
    btcPrice = btcPrice[0].price.toString();
    _prices['bitcoin'] = btcPrice;
    // Get peercoin price
    request.get({ url: 'https://btc-e.com/api/2/ppc_usd/trades', method: "GET" }, function (err, resp, body){
      var ppcPrice = JSON.parse(body);
      ppcPrice = ppcPrice[0].price.toString();
      _prices['peercoin'] = ppcPrice;
      request.get({ url: 'https://btc-e.com/api/2/ltc_usd/trades', method: "GET" }, function (err, resp, body){
        var ltcPrice = JSON.parse(body);
        ltcPrice = ltcPrice[0].price.toString();
        _prices['litecoin'] = ltcPrice;
        request.get({ url: 'http://pubapi.cryptsy.com/api.php?method=marketdatav2', method: "GET" }, function (err, resp, body){
          var dogePrice = JSON.parse(body);
          //
          // Note: doge/usd is calculated as value of doge/btc then btc/usd
          //
          dogePrice = new BigNumber(dogePrice.return.markets['DOGE/BTC'].lasttradeprice);
          dogePrice = dogePrice.times(new BigNumber(_prices['bitcoin'])).toFixed();
          _prices['dogecoin'] = dogePrice;
          // store the prices in the datasource
          prices.create({ prices: _prices }, callback);
        });
      });
    });
  });
});

prices.method('latest', function (callback) {
  prices.find({ limit: 1, order: "ctime DESC" }, function(err, results){
    if (err) {
      throw err;
    }
    callback(null, results[0]);
  });
});

prices.method('calculate', function (options, callback) {
  var price;
  try {
    price = new BigNumber(options.amount);
  } catch(err) {
    return callback(err);
  }
  prices.latest(function(err, _prices) {
    if (err) {
      return callback(err);
    }
    price  = price.times(new BigNumber(_prices.prices[options.currency])).round(2);
    return callback(null, { currency: "USD", total: price.toString() });
  });
});

exports.prices = prices;