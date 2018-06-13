"use strict";


var Match = function(str) {
	if (str) {
		var obj = JSON.parse(str);
        this.text = obj.text;
        this.host=obj.host;
        this.guest=obj.guest;
        this.start = obj.start; //start time
        this.enable=obj.enable;
        this.winner=obj.winner; //123
        this.score=obj.score;

	} else {
	    this.text = "";
        this.host="";
        this.guest="";
        this.start = ""; //start time
        this.enable=true;
        this.winner=""; //123
        this.score="";
	}
};
Match.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};
var Team = function(str) {
	if (str) {
        var obj = JSON.parse(str);
        this.name=obj.name;
        this.pic=obj.pic;

	} else {
	    this.name="";
        this.pic="";
	}
};

Team.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};
var Bet = function(str) {
	if (str) {
        var obj = JSON.parse(str);
        this.winner=obj.winner;
        this.cost = obj.cost;
        this.time=obj.time;
        this.from=obj.from;

	} else {
	    this.winner="";
        this.cost = "";
        this.time="";
        this.from="";
	}
};

Bet.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var Record = function(str) {
	if (str) {
        var obj = JSON.parse(str);
        this.cost=obj.cost;
        this.bonus=obj.bonus;
        this.time = obj.time;
		this.from = obj.from;
	} else {
        this.cost="";
        this.bonus="";
        this.time = "";
		this.from = "";
	}
};

Record.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var WorldCupGo=function(){
    LocalContractStorage.defineProperties(this, {
        builder: null,
        matchIndex: null,
        betIndex:null,
        recordIndex:null,
        teamIndex:null
    });
    LocalContractStorage.defineMapProperties(this,{
        serToResult:null,
        addrToMids:null,
        addrMidToBids:null, 
        
        midToHostBids:null, //addr array
        midToHostNas:null,
        midToDrawBids:null,
        midToDrawNas:null,
        midToGuestBids:null,
        midToGuestNas:null,
        midToBonusRids:null
    });
    
    LocalContractStorage.defineMapProperties(this, {
        indexToMatch:{
            parse: function (text) {
                return new Match(text);
            },
            stringify: function (o) {
                return o.toString();
            }
        },
        indexToBet:{
            parse: function (text) {
                return new Bet(text);
            },
            stringify: function (o) {
                return o.toString();
            }
        },
        indexToRecord:{
            parse: function (text) {
                return new Record(text);
            },
            stringify: function (o) {
                return o.toString();
            }
        },
        indexToTeam:{
            parse: function (text) {
                return new Team(text);
            },
            stringify: function (o) {
                return o.toString();
            }
        }
        
    });
}

WorldCupGo.prototype = {
    
    init:function(builder){
        this.builder=builder//Blockchain.transaction.from;
        this.matchIndex=0;
        this.betIndex=0;
        this.recordIndex=0;
        this.teamIndex=0;

        //this.create32Team();
    },
    _verAddress:function(addr){
        if (!Blockchain.verifyAddress(addr)) {
            throw new Error("account address error")
        }
        return true;
    },
    _isInArray(val,arr){ 
        var arrStr=","+arr.join(",")+","; 
    　　return arrStr.indexOf(","+val+",")>-1;
     },
    _sort:function(arr){
        arr.sort(function(a,b){
            return b.start-a.start;
        	}
        );
        return arr;
    },
    _getNow:function(){
        return Math.floor(Date.parse( new Date())/1000);
    },
    _isBuilder:function(addr){
       // this._verAddress(addr);
        if(addr!==this.builder){
            throw new Error("you have no permission")
        }
    },
    _getMatch:function(id,addr){
        var match=this.indexToMatch.get(id);
        match.id=id;
        match.host=this.indexToTeam.get(match.host);
        match.guest=this.indexToTeam.get(match.guest);
        match.hostIds=this.midToHostBids.get(id)||[];
        match.hostNas=this.midToHostNas.get(id)||0;
        match.drawIds=this.midToDrawBids.get(id)||[];
        match.drawNas=this.midToDrawNas.get(id)||0;
        match.guestIds=this.midToGuestBids.get(id)||[];
        match.guestNas=this.midToGuestNas.get(id)||0;
        if(addr){
            var arr=[];
            var bids=this.addrMidToBids.get(addr+'_'+id)||[];
            bids.forEach(bid => {
                var bet=this.indexToBet.get(bid);
                arr.push(bet);
            });
            match.myBets=arr;
        }
        if(!match.enable){
            match.bonus=this.getBonusRecord(id);
        }
        return match;
    },
    _getMyMatch:function(addr){
        var mids=this.addrToMids.get(addr)||[];
        var arr=[];
        for (var i = mids.length; i > 0; i--) {
            var m=this._getMatch(mids[i-1],addr)
            arr.push(m);
        }
        return arr;
    },
    getMyMatches:function(addr){
        return this._getMyMatch(addr);
    },

    getMatchById:function(id){
        return this.indexToMatch.get(id)
    },
    getAllMatches:function(){
        var arr=[];
        var endarr=[];
        var now=this._getNow();
        for (var i = 1; i <= this.matchIndex; i++) {
            var m=this._getMatch(i)
            if(m.enable&&(m.start>now+3600)) arr.push(m);
            else endarr.push(m);
        }
        return [arr,endarr];
    },
    getBonusRecord:function(mid){
        var rids=this.midToBonusRids.get(mid)||[];
        var arr=[];
        rids.forEach(rid => {
            var rec=this.indexToRecord.get(rid);
            arr.push(rec);
        });
        return arr;
    },
    transReceipt:function(serial){
        return this.serToResult.get(serial);
    },

    getBaseData:function(addr){
        var result={};
        //this._verAddress(addr);
        var marr=this.getAllMatches();
        result['matches']=marr[0];
        result['endmatches']=this._sort(marr[1]);
        result['mymatches']=this.getMyMatches(addr);
        result['from']=addr;
        return result;
    },
    
   
    bet:function(mid,bet,serial){
        var from=Blockchain.transaction.from;
        var value=Blockchain.transaction.value;
        var now=Blockchain.transaction.timestamp;
        bet=Math.abs(parseInt(bet));
        if(isNaN(bet)||bet==0||bet>3){
            throw new Error('bet error');
        }
        if(value.lessThan(10000000000000000)){
            throw new Error('you must pay enough nas');
        }
        var match=this.indexToMatch.get(mid);
        if(!match){
            throw new Error('match id error');
        }
        if(!match.enable||(match.start<=now+3600)){
            throw new Error('the match has closed the bets')
        }
        this.betIndex++;
        var b=new Bet();
        b.winner=bet;
        b.cost=value;
        b.from=from;

        this.indexToBet.set(this.betIndex,b);
        switch (bet) {
            case 1:
                var hbids=this.midToHostBids.get(mid)||[];
                var nas=this.midToHostNas.get(mid)||0;
                hbids.push(this.betIndex);
                nas=value.plus(nas);
                this.midToHostNas.set(mid,nas);
                this.midToHostBids.set(mid,hbids);
                break;
            case 2:
                var dbids=this.midToDrawBids.get(mid)||[];
                var nas=this.midToDrawNas.get(mid)||0;
                dbids.push(this.betIndex);
                nas=value.plus(nas);
                this.midToDrawNas.set(mid,nas);
                this.midToDrawBids.set(mid,dbids);
                break;
            case 3:
                var gbids=this.midToGuestBids.get(mid)||[];
                var nas=this.midToGuestNas.get(mid)||0;
                gbids.push(this.betIndex);
                nas=value.plus(nas);
                this.midToGuestNas.set(mid,nas);
                this.midToGuestBids.set(mid,gbids);
                break
            default:
                throw new Error('bet error x');
        }
        var bids=this.addrMidToBids.get(from+'_'+mid)||[];
        bids.push(this.betIndex);
        this.addrMidToBids.set(from+'_'+mid,bids);

        var mids=this.addrToMids.get(from)||[];
        if(!this._isInArray(mid,mids)) {
            mids.push(mid);
            this.addrToMids.set(from,mids);
        }
        this.serToResult.set(serial,this.betIndex);

    },
    login:function(addr){
        return Blockchain.verifyAddress(addr);
    },


    _split:function(bid,bon){
        var bet=this.indexToBet.get(bid);
        var bonus=new BigNumber(bon).times(bet.cost);
        var val=bonus.plus(bet.cost);
        Blockchain.transfer(bet.from,val);
        Event.Trigger("SplitBonus", {
            Transfer: {
              from: Blockchain.transaction.to,
              to: bet.from,
              value: val.toString()
            }
          });
        this.recordIndex++;
        var rec=new Record();
        rec.cost=bet.cost;
        rec.bonus=bonus;
        rec.time=this._getNow();
        rec.from=bet.from;
        this.indexToRecord.set(this.recordIndex,rec);
        return this.recordIndex;
    },
    _splitBonus:function(mid,winner){
        var hnas=new BigNumber(this.midToHostNas.get(mid)||0);
        var dnas=new BigNumber(this.midToDrawNas.get(mid)||0);
        var gnas=new BigNumber(this.midToGuestNas.get(mid)||0);
        var recArr=[];
        switch (winner) {
            case 1:
                var hbids=this.midToHostBids.get(mid)||[];
                var bon=dnas.plus(gnas).div(hnas).toFixed(3,1);
                hbids.forEach(bid => {
                    var rid= this._split(bid,bon);
                    recArr.push(rid)
                });
                break;
            case 2:
                var dbids=this.midToDrawBids.get(mid)||[];
                var bon=hnas.plus(gnas).div(dnas).toFixed(3,1);
                dbids.forEach(bid => {
                    var rid= this._split(bid,bon);
                    recArr.push(rid)
                });
                break;
            case 3:
                var gbids=this.midToGuestBids.get(mid)||[];
                var bon=hnas.plus(dnas).div(gnas).toFixed(3,1);
                gbids.forEach(bid => {
                    var rid= this._split(bid,bon);
                    recArr.push(rid)
                });
                break;
            default:
                break;
        }
        this.midToBonusRids.set(mid,recArr);
    },
    createTeam:function(name,pic,serial){
        var from=Blockchain.transaction.from;
        this._isBuilder(from)
        this.teamIndex++;
        var t=new Team();
        t.name=name;
        t.pic=pic;
        this.indexToTeam.set(this.teamIndex,t);
        this.serToResult.set(serial,this.teamIndex);
        return t;
    },

    create32Team:function(){ //2018
        var teams=['德国','西班牙','巴西','法国','俄罗斯','沙特阿拉伯','埃及','乌拉圭','葡萄牙','摩洛哥','伊朗','澳大利亚','秘鲁','丹麦','阿根廷','冰岛','克罗地亚','尼日利亚','瑞士','哥斯达黎加','塞尔维亚','墨西哥','瑞典','韩国','比利时','巴拿马','突尼斯','英格兰','波兰','塞内加尔','哥伦比亚','日本'];
        var arr=[]
        var self=this;
        teams.forEach(function(t,i) {
            var team=self.createTeam(t,i+1,'xxx');
            arr.push(team);
        });
        return arr;
    },
    
    createMatch:function(hostid,guestid,start,text,serial){
        var from=Blockchain.transaction.from;
        this._isBuilder(from)
        this.matchIndex++;
        var match=new Match();
        match.text=text;
        match.host=hostid;
        match.guest=guestid;
        match.start=start;
        this.indexToMatch.set(this.matchIndex,match);
        this.serToResult.set(serial,this.matchIndex);
    },

    finalMatch:function(id,winner,score,serial){
        var from=Blockchain.transaction.from;
        this._isBuilder(from)
        var m=this.indexToMatch.get(id);
        if(!m.enable||m.score){
            throw new Error('the match has been arbitraged')
        }
        m.enable=false;
        m.winner=winner;
        m.score=score;
        this._splitBonus(id,winner);
        this.indexToMatch.set(id,m);
        this.serToResult.set(serial,m.score);
    },
    
    cancelMatch:function(id){
        var from=Blockchain.transaction.from;
        this._isBuilder(from);
        var m=this.indexToMatch.get(id);
        m.enable=false;
        this.indexToMatch.set(id,m);
    },
    takeout:function(value){
        var from=Blockchain.transaction.from;
        this._isBuilder(from);
        value=new BigNumber(value).shift(18);
        Blockchain.transfer(this.builder,value);
        Event.Trigger("takeout", {
            Transfer: {
              from: Blockchain.transaction.to,
              to: from,
              value: value.toString()
            }
          });
    }

}
module.exports = WorldCupGo;