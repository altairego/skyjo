vals = [];
cards = [];
pioche = [];
rebut = [];
players = ["fred","chris"];
_p = document.location.search.match(/^(?:(?:\?|,)([a-z0-9]+))+/i);
if (_p) players = document.location.search.substr(1).split(',');
players_hand = [];
scores = [];
score_table = [];
score_total = [];
phase = {
    turn: null,
    mode: "init" // => pioche, rebut, deck, switch + start, winner
};
gamediv = null;
piochediv = null;
rebutdiv = null;
maindiv = null;
msgdiv = null;
acdiv = null;

nbcardslist = [5,10,15,10];
nbcards = null;

// only for debug
var fakestart = false;

function init() {
    gamediv = document.getElementById('decks');
    piochediv = document.getElementById('pioche');
    rebutdiv = document.getElementById('rebut');
    maindiv = document.getElementById('main');
    msgdiv = document.getElementById('messages');
    acdiv = document.getElementById('animcard');
    scoretab = document.getElementById('scores');

    for(var v = -2; v<=12; v++) {
        var face = (v+2).toString(16);
        vals.push(v);
        if (nbcardslist.length) nbcards = nbcardslist.shift();
        for(var n=0; n<nbcards; n++) {
            cards.push(face+n.toString(16));
        }
    }

    var scorehead = document.createElement('tr');
    var head = "";
    players.forEach(function(player) {
        score_total.push(0);
        head += '<td class="name">' + player + '</td>';
    });
    scorehead.innerHTML = head;
    scoretab.appendChild(scorehead);
    
    start();    
}

function animCard(src, dst) {
    var _src = src.getBoundingClientRect();
    var _dst = dst.getBoundingClientRect();

    acdiv.className = "";
    
    setTimeout(() => {
        acdiv.style.left = _src.x + "px";
        acdiv.style.top = _src.y + "px";

        setTimeout(() => {
            acdiv.className = "card visible";
            acdiv.style.left = _dst.x + "px";
            acdiv.style.top = _dst.y + "px";

            setTimeout(() => {
                acdiv.className = "";

                acdiv.style.left = 0;
                acdiv.style.top = 0;
            }, 250);
        }, 20);
    }, 5);
}

function cardval(card) {
    if (!card) return 0;
    return card.charCodeAt(0)>57?card.charCodeAt(0)-89:card.charCodeAt(0)-50;
}

function cardfingerprint(card, r) {
    if (!card) return 0;
	
    var t = (card.charCodeAt(0)*100 + card.charCodeAt(1)) * (r?r:1);
	return (Math.log2(t) * 10e15) % 100000;
}


function getpioche(src) {
    var pioche;
    if (src) { // rebut => pioche
        pioche = [].concat(src);
        src = [];
    } else
        pioche = [].concat(cards);

    var r1 = Math.random() * 4;

    pioche.sort(function(a,b) {
        return cardfingerprint(a, r1) - cardfingerprint(b, r1);
    })

    return pioche;
}

function start() {
    phase = {
        turn: null,
        mode: "init" // => pioche, rebut, deck, switch
    };
    pioche = getpioche();
    scores = [];
    players_hand = players.map(function (params) {
        score_total.push(0);
        return pioche.splice(0,12).map(function(card,_c) {
            return {card: card, st: fakestart&&_c<8?'face':'turned'};
        });
    })

    rebut = pioche.splice(0,1);
    //setPhase("pioche", null, "pioche une carte ou prend celle du rebut");
    setPhase("start"); //, null, "sélectionne deux carte à retrouner avant de commencer");
}

function resetPioche() {
    pioche = pioche.concat(getpioche(rebut.splice(1)));
}

function setCardDiv(dc, card, st) {
    if (!card) {
        dc.className = "card "+(st?st:'');
        dc.innerHTML = "";
        return;
    }
    dc.className = "card card"+card.charAt(0)+" "+(st?st:'');
    dc.innerHTML = cardval(card);
}

function checkColMatch(player, col) {
    if (
        players_hand[player][col].st == "face"
        &&
        players_hand[player][col+4].st == "face"
        &&
        players_hand[player][col+8].st == "face"
        &&
        players_hand[player][col].card
        &&
        players_hand[player][col+4].card
        &&
        players_hand[player][col+8].card
        &&
        players_hand[player][col].card[0] == players_hand[player][col + 4].card[0]
        &&
        players_hand[player][col + 4].card[0] == players_hand[player][col + 8].card[0]
    ) {
        rebut.unshift(players_hand[player][col].card);
        rebut.unshift(players_hand[player][col+4].card);
        rebut.unshift(players_hand[player][col+8].card);
        players_hand[player][col] = players_hand[player][col+4] = players_hand[player][col+8] = {card: null, st: "none"};
    }
}

function displayHand(player, allfaced) {
    var dp = document.getElementById('p'+player);
    var dn, ds;
    if (!dp) {
        gamediv.appendChild(
            (dp = document.createElement('div'))
        );
        dp.id = 'p'+player;
        dp.className = "deck"+(player === phase.turn?" current":"");

        dp.appendChild(
            (dn = document.createElement('div'))
        );
        dn.id = 'p'+player+'n';
        dn.className = "name";
        dn.innerHTML = players[player];

        dp.appendChild(
            (ds = document.createElement('div'))
        );

        ds.id = 'p'+player+'s';
        ds.className = "score";
        ds.innerHTML = 0;
    } else {
        dp.className = "deck"+
            (player === phase.turn?" current":"")+
            (phase.lastturn && phase.targetplayer==player ? " targetplayer":"")
        ;
        ds = document.getElementById('p'+player+'s');
    }

    var score = 0;
    if (allfaced) {
        players_hand[player].forEach(function(card, idx) {
            card.st = "face";
        });

        checkColMatch(player, 0);
        checkColMatch(player, 1);
        checkColMatch(player, 2);
    }
    players_hand[player].forEach(function(card, idx) {
        var dc = document.getElementById('p'+player+'c'+idx);

        if (!dc) {
            dp.appendChild(
                (dc = document.createElement('div'))
            );
            dc.id = 'p'+player+'c'+idx;
            dc.onclick = function() { onPlayercard(this); };
        }
        if (allfaced) card.st = "face";
        setCardDiv(dc, card.card,card.st);
        if (card.st != 'turned') score+=cardval(card.card);
    });
    ds.innerHTML = score;
    scores[player] = score;
}

function displayScores() {
    var scoreline = document.createElement('tr');
    var line = "";

    players.forEach(function(player, _p) {
        score_total[_p] += scores[_p];
        line += '<td class="score">' + score_total[_p] + ' <span class="diffscore">(' + (scores[_p]<0?'':'+') + scores[_p] + ')</span></td>';
    });
    scoreline.innerHTML = line;
    scoretab.appendChild(scoreline);
}

function displayHands() {
    players.forEach(function(player, _p) {
        displayHand(_p);
    });
    for (var _r=0; _r<4; _r++)
        setCardDiv(_r?document.getElementById('rebut'+_r):rebutdiv, rebut[_r], _r?'partial':'');
    setCardDiv(maindiv, phase.card);
}

function setPhase(mode, card, msg) {
    if (mode == "start") {
        msg = "choisis 2 cartes à retourner pour commencer";
        if (phase.turn===null) {
            phase.choice = 0;

            phase.turn = 0;
            phase.score = 0;
            phase.maxc = -20;

            phase.start = 0;
            phase.startscore = -20;
            phase.startmaxc = -20;
        } else if (phase.choice>0) {
            if (phase.score>phase.startscore || (phase.score==phase.startscore && phase.maxc>phase.startmaxc)) {
                phase.start = phase.turn;
                phase.startscore = phase.score;
                phase.startmaxc = phase.maxc;
            }
            if (phase.turn>=players.length-1) {
                var score = scores[0];

                phase.turn = phase.start; // le plus gros score
                setPhase("pioche", null, "pioche une carte ou prend celle du rebut");
                return;
            }
            phase.score = 0;
            phase.choice = 0;
            phase.turn = (phase.turn+1)%players.length;
        } else phase.choice++;
    }

    if (mode == "pioche" && phase.mode != "start") {
        phase.turn = (phase.turn+1)%players.length;
    }
    if (mode == "undorebut") {
        mode="pioche";
    }
    if (mode == "winner") {
        phase.lastturn=false;
    }
    phase.mode = mode;
    phase.card = card;
    console.log(JSON.stringify(phase));
    document.body.className = mode;
    msgdiv.innerHTML = "<strong>"+players[phase.turn]+"</strong>, "+msg + (phase.lastturn?'<span class="warn"> ⚠ Dernier tour</span>':'');

    if (mode == "winner")
        displayScores();
    else
        displayHands();
}

function onPioche() {
    if (phase.mode == "winner") {
        start();
        return;
    }
    if (phase.mode != "pioche") return;

    if (pioche.length<2) resetPioche();
    animCard(piochediv, maindiv);
    setPhase("deck", pioche.shift(), "place la carte de la main sur ton jeu, ou met la main au rebut");
}

function onRebut() {
    if (phase.mode == "switch") {
        // reprendre la carte du rebut
        // repaser en mode deck
        animCard(rebutdiv, maindiv);
        setPhase("deck", rebut.shift(), "place la carte de la main sur ton jeu, ou remet la main au rebut");
        return;
    }

    if (phase.mode != "pioche") return;

    animCard(rebutdiv, maindiv);
    setPhase("rebut", rebut.shift(), "place la carte de la main sur ton jeu <em>(ou remet la carte au rebut)</em>");
}

function onMain() {
    if (phase.mode == "rebut") {
        // remettre la carte sur le rebut
        // repaser en mode pioche, mais pas de changement de joueur...
            animCard(maindiv, rebutdiv);
            rebut.unshift(phase.card);
            setPhase("undorebut", null, "pioche une carte ou prend celle du rebut");
        return;
    }

    if (phase.mode != "deck") return;

    animCard(maindiv, rebutdiv);
    rebut.unshift(phase.card);

    setPhase("switch", null, "retourne une carte de ton jeu <em>(ou reprend la carte du rebut)</em>");
}

function onPlayercard(dc) {
    var player, pos, card;
    player = parseInt(dc.id[1]);

    if (phase.mode == "start") {
        pos = parseInt(dc.id.substr(3));
        if (players_hand[player][pos].st != "turned") return;        
        dc.classList.remove("turned");
        players_hand[player][pos].st = "face";
        var _v = cardval(players_hand[player][pos].card);
        phase.score += _v;
        phase.maxc = Math.max(_v, phase.maxc);
        setCardDiv(dc, phase.card);
        setPhase("start");
        return;
    }
    if (phase.mode == "pioche") return;

    if (phase.turn === player) {
        pos = parseInt(dc.id.substr(3));

        if (players_hand[player][pos].st == "none") return;
        if (players_hand[player][pos].st == "face" && phase.mode == "switch") return;

        dc.classList.remove("turned");

        if (phase.mode != "switch") {
            card = players_hand[player][pos].card;
            animCard(maindiv, dc);
            rebut.unshift(card);
            players_hand[player][pos].card = phase.card;
            setTimeout(() => {
                animCard(dc, rebutdiv);
            }, 500);
        }

        players_hand[player][pos].st = "face";
        setCardDiv(dc, phase.card);

        var col = pos % 4;
        checkColMatch(player, col);

        if (!phase.lastturn) {
            var nbturned = 0;
            players_hand[player].forEach(function(card) {
                if (card.st=="turned") nbturned++;
            });
            if (nbturned == 0) {
                phase.targetplayer = player;
                phase.lastturn = true;
                phase.remain = players.length - 1;
            }    
        } else {
            phase.remain--;
            if (phase.remain==0) {
                var double = false;
                phase.turn = phase.targetplayer;
                displayHand(phase.turn, true);
                players.forEach(function(player, _p) {
                    if (phase.turn != _p) {
                        displayHand(_p, true);
                        if (scores[phase.turn] > 0 && scores[_p] <= scores[phase.turn]) {
                            double = true;
                        }
                    }
                });

                if (double) {
                    scores[phase.turn] *= 2;
                }
            
                score_table.push(scores);

                if (double)
                    setPhase("winner", null, "pas de chance, votre score à doublé à "+scores[phase.turn]);
                else
                    setPhase("winner", null, "bien joué pour ce mini-score : "+scores[phase.turn]);
                
                return;
            }
        }

        setPhase("pioche", null, "pioche une carte ou prend celle du rebut");
    }
}

