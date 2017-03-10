require('dotenv').config();
var express = require('express');
var request = require('request');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var urlify = require('urlify').create({
    addEToUmlauts: true,
    szToSs: true,
    spaces: "+",
    nonPrintable: "_",
    trim: true
});


var app = express();
mongoose.connect(process.env.DB_URI);

var historySchema = mongoose.Schema({
    search_string: String,
    timestamp: { type: Date, default: Date.now }
});
var History = mongoose.model('History', historySchema);

app.get('/', function (req, res) {
    res.send("<h1>Image Abstraction Landing Page</h1>");
});

app.get('/api/latest/imagesearch', function (req, res) {
    var query = History.find({}).sort('-timestamp').select('-_id -__v');

    query.exec(function (err, history) {
        if (err) throw err;

        if (history.length === 0) {
            res.send('No Queries Registered to Query History...')
        } else {
            res.json(history);
        }

    });
});

app.get('/api/imagesearch/:search', function (req, res) {
    var searchString = urlify(req.params.search);

    var newHistory = new History({
        search_string: searchString
    });

    newHistory.save(function (err, result) {
        if (err) throw err;
        console.log('Query {' + searchString + '} Saved to History Collection...');
    })

    var queryParams = {
        key: process.env.API_KEY,
        q: searchString,
        per_page: 10,
        page: req.query.offset ? req.query.offset : 1,
        pretty: process.env.DEBUG ? process.env.DEBUG : false
    }

    var options = {
        method: 'GET',
        uri: process.env.API_URI,
        json: true,
        qs: queryParams
    }

    request(options, function (error, response, data) {
        if (error) throw error;

        if (data.totalHits === 0 || !data.totalHits) {
            res.send('No hits registered at Pixelbay for "' + searchString + '"');
        } else {
            res.json(data.hits);
        }
    })
});


app.listen(process.env.PORT, function () {
    console.log('Listening on port ' + process.env.PORT + '...');
})