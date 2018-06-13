var nebulas = require("nebulas"),
    NebPay = require("nebpay"),
    Account = nebulas.Account,
    HttpRequest = nebulas.HttpRequest,
    Neb = nebulas.Neb;
    
var nasConfig = {
  mainnet: {
      chainID:'1',
      contractAddress: "n1jMwPraUY7tynm4RTMb8g6akbpP5fvDxvq",
      host: "https://mainnet.nebulas.io",
      payHost: "https://pay.nebulas.io/api/mainnet/pay"
  },
  testnet: {
      chainID:'1001',
      contractAddress: "n1ssLkuVyi2uuWCmTojwE2GtAfp5pwgVEua",
      host: "https://testnet.nebulas.io",
      payHost: "https://pay.nebulas.io/api/pay"
  }
}
var neb = new Neb();
var chainInfo=nasConfig.mainnet;

neb.setRequest(new HttpRequest(chainInfo.host));
var nasApi = neb.api;

var nebPay = new NebPay();

var account;
var isMobile;
var dappAddress=chainInfo.contractAddress;
var wait,transSerial,transTimer;
var tab=2,matches,myMatches,endMatches,mindex;
let BETS=['','主队胜','平局','客队胜'];

window.App = {
  start: function () {
    
    this.getAccount();
  },
  get: function (func,args,callback) {
    var self = this
    nasApi.call({
        chainID: chainInfo.chainID,
        from: dappAddress,
        to: dappAddress,
        value: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {
            function: func,
            args: args
        }
    }).then(function (resp) {
        console.log('----'+resp.result)
        if(callback) callback(JSON.parse(resp.result))
    })
},

transReceipt:function(cb){
  var self=this;
  if(wait>10){
    $.hidePreloader();
    $.toast('超时，请自行刷新查看！');
    return ;
  }
  $.showPreloader('交易确认中...'+wait)
  this.get("transReceipt","[\""+transSerial+"\"]",function(result){
    if(result){
      console.log('result='+JSON.stringify(result))
      $.hidePreloader();
      if(cb)cb(result);
    }else{
      wait++;
      setTimeout(() => {
        self.transReceipt(cb);
      }, 5000);
    }
  });
},

login:function(){
  var self=this;
  var addr=$('#wallet-address').val().trim();
  if(addr==""){
    return $.toast('地址不能为空！',500);
  }
  var args= "[\""+addr+"\"]";
  $.showPreloader('登录验证中...')
  this.get("login",args,function(result){
    $.hidePreloader();
    if(result){
      account=addr;
      localStorage.setItem("account",account)
      self.closePopup();
      self.selectAll();
    }else $.toast('地址验证失败，请重试！',500);
  })
  
},

selectMine:function(){
  tab=1;
  $('.tab').removeClass('active');
  $('.my-match-tab').addClass('active')
  if(!this.checkUser()) return;
  this.initMyMatches();
},
selectAll:function(){
  tab=2;
  $('.tab').removeClass('active');
  $('.all-match-tab').addClass('active');

  this.getBaseData();
},
selectEnd:function(){
  tab=3;
  $('.tab').removeClass('active');
  $('.end-match-tab').addClass('active')
  
  this.initEndMatches();
},

openTipPop:function(){
  $.popup('.popup-tip');

},

openCreatePop:function(){

  $.popup('.popup-create');
},
openloginPop:function(){
  $.popup('.popup-login');
  
},

openBetPop:function(idx){
  $('.bet-item').addClass('hide');
  mindex=idx;
  var m=matches[idx]
  if(tab==3){
    m=endMatches[idx];
    var html='<h2 class="red ">'+(m.enable?'等待比赛结果':'比赛结果：'+m.score)+'</h2><div class="content-block"><div class="row"><div class="col-33">主队胜 ('+m.hostIds.length+')<p>'+nebPay.toNas(m.hostNas)+'</p></div><div class="col-33">平局 ('+m.drawIds.length+')<p>'+nebPay.toNas(m.drawNas)+'</p></div><div class="col-33">客队胜 ('+m.guestIds.length+')<p>'+nebPay.toNas(m.guestNas)+'</p></div></div></div>';
    var item='';
    var total=0;
    if(!m.enable){
      m.bonus.forEach(rec => {
        var nas=nebPay.toNas(rec.bonus);
        total+=parseInt(rec.bonus);
        item+='<p>用户 <span class="lightGray">'+rec.from+'</span> 分得奖金：'+nas+' NAS +'+nebPay.toNas(rec.cost)+'本金</p>'
      });
      html+='<div class="content-block"><p class="theme">选择 ['+BETS[m.winner]+'] 的用户将瓜分 '+nebPay.toNas(total)+' NAS</p> <hr>'+item+'</div>'
    }
    $('#bet-final').removeClass('hide');
    $('#bet-final').html(html);
  }else if(tab==1){
    m=myMatches[idx];
    var bets=m.myBets||[];
    var html='';
    bets.forEach(b => {
      html+='<div class="card-content text-center">你投注了: ['+ BETS[b.winner]+']，金额：'+nebPay.toNas(b.cost)+' NAS</div>';
    });
    $('#bet-my-bet').removeClass('hide')
    $('#bet-my-bet').html(html)
  }
  if(tab<3){
    if(this.checkMatch(m)){
      $('#bet-select').removeClass('hide');
      $('#bet-host').text(nebPay.toNas(m.hostNas)+' NAS ('+m.hostIds.length+')')
      $('#bet-draw').text(nebPay.toNas(m.drawNas)+' NAS ('+m.drawIds.length+')')
      $('#bet-guest').text(nebPay.toNas(m.guestNas)+' NAS ('+m.guestIds.length+')')
    }else
      $('#bet-end').removeClass('hide');
  }
  $('#bet-match').html(this.getMatchView(m));
  $.popup('.popup-bet');
},




closePopup:function(){
  $.closeModal();
},

openApp:function(){
  var appParams = {
		category: "jump",
		des: "confirmTransfer",
		pageParams: "{}"
	};
	var url = "openapp.NASnano://virtual?params=" + JSON.stringify(appParams);
	// window.location.href = url;
  // var url = "openapp.NASnano://virtual?params=1";
  alert(url);
	window.location.href = url
},



getBaseData:function(){
  var self=this;
  // this.checkUser();
  var args= "[\""+account+"\"]";
  $.showPreloader('比赛加载中...')
  this.get("getBaseData",args,function(result){
    $.hidePreloader();
    if(result){
      console.log(result);
      matches=result.matches;
      myMatches=result.mymatches;
      endMatches=result.endmatches;
      self.initAllMatches();
    }
  })
},

getAllMatches:function(){
    var self=this;
    // this.checkUser();
    $.showPreloader('数据加载中...')
    this.get("getAllMatches","",function(result){
      $.hidePreloader();
      if(result){
        matches=result;
       self.initAllMatches();
      }
    })
  },

  

  initAllMatches:function(){
    if(!matches.length) return
    matches=matches;
    var self=this;
    var html = '';
    matches.forEach(function(m,i) {
      var nas=nebPay.toNas(parseInt(m.hostNas)+parseInt(m.drawNas)+parseInt(m.guestNas));
      var num=m.hostIds.length+m.drawIds.length+m.guestIds.length;
      html += '<div class="content-block "><div class="card" onclick="App.openBetPop('+i+')">'+self.getMatchView(m)+'<div class="card-content-inner text-center"><p class="theme">'+nas+' nas ( '+num+'注 ) </p></div><div class="pull-right"><span class="lightGray"> #'+m.id+'</span></div></div></div>';
    });
    $('#all-match').html(html);
  },

  initMyMatches:function(){
    if(!myMatches.length) return
    var self=this;
    var html = '';
    myMatches.forEach(function(m,i) {
      var bets=m.myBets||[];
      var txt='你投注了:';
      bets.forEach(b => {
        txt+=' ['+ BETS[b.winner]+':'+nebPay.toNas(b.cost)+' NAS]';
      });
      html += '<div class="content-block "><div class="card" onclick="App.openBetPop('+i+')">'+self.getMatchView(m)+'<div class="card-content-inner text-center"><p class="theme">'+txt+'</p></div></div></div>';
    });
    $('#my-match').html(html);
  },

  initEndMatches:function(){
    if(!endMatches.length) return
    var self=this;
    var html = '';
    endMatches.forEach(function(m,i) {
      var bets=m.myBets||[];
      var txt='#'+m.id+'#'+(m.enable?' 等待比赛结果':'比赛结果：'+m.score);
      html += '<div class="content-block "><div class="card" onclick="App.openBetPop('+i+')">'+self.getMatchView(m)+'<div class="card-content-inner text-center"><p class="theme">'+txt+'</p></div></div></div>';
    });
    $('#end-match').html(html);
  },


  getMatchView:function(match){
    var host=match.host;
    var guest=match.guest;
    return '<div class="card-content"><div class="card-content-inner text-center"><p>'+this.toDate(match.start)+'</p><p>'+match.text+'</p></div></div><div class="card-content"><div class="content-block match-view"><div class="row"><div class="col-45"><div class="card-content text-center"><img src="./image/'+host.pic+'.png" class="card-cover" ><p>'+host.name+'</p></div></div><div class="col-10 text-center mt-3">VS</div><div class="col-45"><div class="card-content text-center"><img src="./image/'+guest.pic+'.png" class="card-cover" ><p>'+guest.name+'</p></div></div></div></div></div>'
  },


  bet:function(bet){
    if(!this.checkUser()) return;
    var self=this;
    $.modal({
      title: '您选择:'+BETS[bet],
      text:  '<input type="text" class="my-input bet-input" placeholder="输入投注金额，最少0.01 NAS"/> ',
      buttons: [{text: '取消'},{
          text: '确定',
          bold: true,
          onClick: function () {
            var val=$('.bet-input').val().trim();
            self.betMatch(bet,val)
            //$.alert('bet:'+val)
          }
        },
      ]
    })
  },


  betMatch:function(bet,val){
    var self=this;
    val=Math.abs(val);
    if(val==""||isNaN(val)||val<0.01)
      return $.toast('金额输入错误！',500)
    var m=tab==1?myMatches[mindex]:matches[mindex];
    transSerial=this.getRandCode(10);
    var callArgs= "["+m.id+","+bet+",\""+transSerial+"\"]";
    nebPay.call(dappAddress, val, "bet", callArgs, {    
        listener: self.betMatchCB
    });
    if(isMobile) this.getBetMatch();
  },

  betMatchCB:function(cb){
    if(cb.txhash&&!isMobile) App.getBetMatch();
  },
  getBetMatch:function(){
    var self=this;
    wait=0;
    this.transReceipt(function(result){
      if(result){
        self.closePopup();
        self.getBaseData();
        $.toast('投注成功！')
      }
    })
  },

  

finalMatch:function(){
  var self=this;
  transSerial=this.getRandCode(10);
  var mid=$('#final-mid').val();
  var score=$('#final-score').val();
  var winner=$('#final-winner').val();
  var callArgs= "["+mid+","+winner+",\""+score+"\",\""+transSerial+"\"]";
  nebPay.call(dappAddress, "0", "finalMatch", callArgs,{    
    listener: self.finalMatchCB
  });
  
  //if(isMobile) this.getFinalMatch()
  
},

finalMatchCB:function(cb){
  if(cb.txhash) console.log('txhash='+cb.txhash)
},
getFinalMatch:function(){
  var self=this;
  wait=0;
  this.transReceipt(function(result){
    if(result){
      self.closePopup();
      self.getBaseData();
      $.toast('评判成功 OK !');
    }
  })
},

  createMatch:function(){
    var self=this;
    transSerial=this.getRandCode(10);
    var host=$('#create-host').val();
    var guest=$('#create-guest').val();
    var text=$('#create-text').val();
    var start=$('#create-start').val()
    start=Date.parse(new Date(start))/1000;
    console.log('time='+start);
    var callArgs= "["+host+","+guest+","+start+",\""+text+"\",\""+transSerial+"\"]";
    nebPay.call(dappAddress, "0", "createMatch", callArgs,{    
      listener: self.createMatchCB
    });
    
    //if(isMobile) this.getCreateMatch()
    
  },
  
  createMatchCB:function(cb){
    if(cb.txhash) console.log('txhash='+cb.txhash)
  },
  getCreateMatch:function(){
    var self=this;
    wait=0;
    this.transReceipt(function(result){
      if(result){
        self.closePopup();
        self.getBaseData();
        $.toast('创建成功 OK !');
      }
    })
  },


  checkMatch:function(match){
     var now=Date.parse(new Date())/1000;
     return match.enable&&(match.start>now+3600)
  },

 
  checkUrl:function(str) {
    var RegUrl = new RegExp(); 
    RegUrl.compile("^[A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+$"); 
    return RegUrl.test(str);
  }, 

  
  toDate:function(ts){
    var date = new Date(ts*1000);
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
    var D = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate()) + ' ';
    var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    var m = (date.getMinutes() <10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
    var s = (date.getSeconds() <10 ? '0' + date.getSeconds() : date.getSeconds());
    return Y+M+D+'　'+h+m+s;
},  

  getRandCode:function(len){
    var d,e,b = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",c = "";
    for (d = 0;d<len; d ++) {
        e = Math.random() * b.length, e = Math.floor(e), c += b.charAt(e);
    }
    return c;  
  },

  checkUser:function(){
    if(browser.versions.qq||browser.versions.weixin){
      var img='./image/'+(browser.versions.ios?'ios':'android')+'.png';
      $('#jump-device').attr('src',img)
       $.popup('.popup-jump');
       return false;
    }
    if(!account&&isMobile){
      this.openloginPop();
      return false;
    } 
    return true;
  },

  getAccount:function(){
    var self=this;
    account=localStorage.getItem('account');
    console.log('local='+account);
    if(isMobile) return self.getBaseData();
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            if (e.data.data.account) {
                account= e.data.data.account
                self.getBaseData();
                console.log('extwallet='+account)
            }
        }
    })

    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
  },

  base64Image : function (img, width) {
    var canvas = document.createElement("canvas");
    var scale = img.height/img.width;
    var height=parseInt(width*scale)
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // var ext = img.src.substring(img.src.lastIndexOf(".")+1).toLowerCase();  
    var dataURL = canvas.toDataURL("image/jpeg",0.7); 
    return dataURL;
  },
  upload:function(img,imgid){
    var self=this;
    var img=img.files[0];
    console.log(img);
   
    if(!(/jpeg|jpg|png|gif|bmp/.test(img.type))){
        return alert('格式错误，请上传图片');
    }
    
    var fromdata=new FormData();
    fromdata.append('smfile',img);
    $.ajax({
          url: "https://sm.ms/api/upload",
          type: 'POST',
          cache: false,
          data: fromdata,
          processData: false,
          contentType: false,
          dataType:"json",
          beforeSend: function(){
              // uploading = true;
              console.log('开始')
              $.showPreloader('图片上传中...')
          },
          success : function(resp) {
            console.log(resp);
            $.hidePreloader();
            $.toast("上传成功！")
            var url=resp.data.url;
            $('#'+imgid).attr('src',url);
            console.log('url='+url);
          },
          error:function(){
            weui.topTips('上传失败了，请重试！')
          }
    });
    // var imgUrl=window.URL.createObjectURL(img);
    // var image = new Image();
    // image.src = imgUrl;  
    // image.onload = function(){  
    //   var base64 = self.base64Image(image,300);  
    //   console.log(base64); 
    //   $('#avatar').attr("src",base64);
    //   $('#avatarData').text(base64);
    // } 
  }
};

var browser = {
  versions: function() {
      var u = navigator.userAgent,
          app = navigator.appVersion;
      return { //移动终端浏览器版本信息
          trident: u.indexOf('Trident') > -1, //IE内核
          presto: u.indexOf('Presto') > -1, //opera内核
          webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
          gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
          mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
          ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
          android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或uc浏览器
          iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器
          iPad: u.indexOf('iPad') > -1, //是否iPad
          webApp: u.indexOf('Safari') == -1, //是否web应该程序，没有头部与底部
          weixin: u.indexOf('MicroMessenger') > -1, //是否微信   
          qq: u.match(/\sQQ/i) !== null//u.indexOf("MQQBrowser")>-1  //是否QQ 
      };
  }(),
  language: (navigator.browserLanguage || navigator.language).toLowerCase()
}

window.addEventListener('load', function () {
  $('.buttons-tab').fixedTab({offset:44});
  isMobile=browser.versions.mobile;
  console.log("isMobile"+isMobile);
  if(typeof(webExtensionWallet) === "undefined"&&!isMobile){
    $("#noExtension").removeClass("hide");
    $(".mainPage").addClass('hide');
  }else{
      App.start();
      // $.init();
  }
});
