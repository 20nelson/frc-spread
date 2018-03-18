const express = require('express');
const path = require('path');
const request = require('request');
const app = express();
app.listen(80);

app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

function generateRequestUrl(params){
    return `https://www.thebluealliance.com/api/v3/${params}?X-TBA-Auth-Key=coxBFPyK9XSvIEJFtneXpFv9jIZ37MfTMoQtzaweu2yrnXA18nAzOuMzsA8AEp8D`;
}

function average(array, fix){
    let sum = 0;
    for(let i = 0; i < array.length; i++){
        sum += array[i];
    }
    return (sum/array.length).toFixed(fix);
}
function deviation(array, fix){
    let avg = average(array, 10);
    let sqrdiffs = array.map(function(v){
        let diff = v-avg;
        return Math.pow(diff, 2);
    });
    let avgdsqrdiffs = average(sqrdiffs, 10);
    return Math.sqrt(avgdsqrdiffs).toFixed(fix);
}

app.get('/', (req,res) => {
    res.render('index');
});

app.get('/spread/:event', (req,res) => {
    request(generateRequestUrl(`event/${req.params.event}/matches/simple`), {json: true}, function(err, resp, body){
        if(body.Errors){
            res.redirect('/');
            return;
        }
        let matches = [];
        let qm = [];
        let qf = [];
        let sf = [];
        let f = [];
        let completion = {
            qm: true,
            qf: true,
            sf: true,
            f: true
        };
        for(let i = 0; i < body.length; i++){
            let a = body[i].alliances;
            if(a.red.score !== -1 && a.blue.score !== -1){
                let spread = Math.abs(a.red.score-a.blue.score);
                matches.push(spread);
                switch(body[i].comp_level){
                    case 'qm':
                        qm.push(spread);
                        break;
                    case 'qf':
                        qf.push(spread);
                        break;
                    case 'sf':
                        sf.push(spread);
                        break;
                    case 'f':
                        f.push(spread);
                        break;
                }

            } else {
                completion[body[i].comp_level] = false;
            }
        }
        let averages = {
            m: average(matches, 2),
            qm: average(qm, 2),
            qf: average(qf, 2),
            sf: average(sf, 2),
            f: average(f, 2)
        }
        let deviations = {
            m: deviation(matches, 2),
            qm: deviation(qm, 2),
            qf: deviation(qf, 2),
            sf: deviation(sf, 2),
            f: deviation(f, 2)
        }
        let spreads = Buffer.from(JSON.stringify({
            m: matches,
            qm: qm,
            qf: qf,
            sf: sf,
            f: f
        })).toString('base64');
        for(let a in averages){
            if(isNaN(averages[a])){
                averages[a] = 'No data'
            }
        }
        for(let d in deviations){
            if(isNaN(deviations[d])){
                deviations[d] = 'No data'
            }
        }
        res.render('spread', {averages: averages, deviations: deviations, completion: completion, spreads: spreads});
    });
    
});