var request = require('request');
var moment = require('moment');
var HTMLParser = require('node-html-parser');
var tableToCsv = require('node-table-to-csv');
var fs = require('fs');
var states = [];
setInterval(function(){
	states = [];
	fs.mkdir('./data/'+moment().format("YYYY-MM-DD"),function(error){
		if(error){
			if(error.code != 'EEXIST'){
				throw error;
			}
		}
	});
	request('http://aws.imd.gov.in/AWS/sta.php?types=aws', function(error, response, body){
		var d = JSON.parse(body);
		for(var i=0;i<d.data.length;i++){
			states.push({"state":d.data[i], district:{}, station:[]});
		}
		getD(0);
	});
}, 86400000);
function getD(i){
	request('http://aws.imd.gov.in/AWS/dis.php?states='+states[i].state+'&types=aws', function(error, response, body){
		if(error) throw error;
		else{
			states[i].district = JSON.parse(body).data;
			console.log(states[i].district);
			if(i === states.length-1){
				getS(0, 0);
				console.log('getting stations');
				return;
			}
			else{
				getD(i+1);
			}
		}
	});
}
function getS(i, j){
	request('http://aws.imd.gov.in/AWS/stat.php/?disc='+states[i].district[j]+'&states='+states[i].state+'&types=aws', function(error, response, body){
		if(error) throw error;
		else{
			var t = JSON.parse(body).data;
			console.log(t);
			states[i].station.push({"district":states[i].district[j], stations:t});
			if(i === states.length-1 && j === states[i].district.length-1){
				console.log(states);
				getData(0, 0, 0);
				console.log('getting data');
				return;
			}
			else{
				if(j === states[i].district.length-1){
					getS(i+1, 0);
				}
				else{
					getS(i, j+1);
				}
			}
		}
	});
}
function getData(i, j, k){
	request('http://aws.imd.gov.in/AWS/dataview.php?a=aws&b='+states[i].state+'&c='+states[i].station[j].district+'&d='+states[i].station[j].stations[k]+'&e='+moment().format("YYYY-MM-DD")+'&f='+moment().format("YYYY-MM-DD")+'&g=ALL_HOUR&h=ALL_MINUTE', function(error, response, body){
		var par = HTMLParser.parse(body);
		var tableText = par.querySelector('table').toString();
		csv = tableToCsv(tableText);
		fs.mkdir('./data/'+moment().format("YYYY-MM-DD")+'/'+states[i].state, function(error){
			if(error){
				if(error.code != 'EEXIST'){
					throw error;
				}
			}
			fs.mkdir('./data/'+moment().format("YYYY-MM-DD")+'/'+states[i].state+'/'+states[i].station[j].district, function(error){
				if(error){
					if(error.code != 'EEXIST'){
						throw error;
					}
				}
				fs.writeFile('./data/'+moment().format("YYYY-MM-DD")+'/'+states[i].state+'/'+states[i].station[j].district+'/'+states[i].station[j].stations[k]+'.csv', csv, 'utf8', function(error){
					if(error) throw error;
					else{
						if(k === states[i].station[j].stations.length-1 && j !== states[i].district.length-1){
							getData(i, j+1, 0);
						}
						else if(k === states[i].station[j].stations.length-1 && j === states[i].district.length-1){
							if(i === states.length-1){
								return;
							}
							else{
								getData(i+1, 0, 0);
							}
						}
						else if(k !== states[i].station[j].stations.length-1){
							getData(i, j, k+1);
						}
					}
				});
			});
		});
	});
}