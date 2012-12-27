//TODO turn this into json from server
var drinkDb = new Array();
drinkDb['beer'] = {
    id: 1,
    s: 2.7
}
drinkDb['small_beer'] = {
    id: 2,
    s: 1.5
}
drinkDb['wine'] = {
    id: 3,
    s: 2.6
}
drinkDb['small_wine'] = {
    id: 4,
    s: 1.3
}
drinkDb['cocktail'] = {
    id: 5,
    s: 1.5
}
drinkDb['short'] = {
    id: 6,
    s: 1
}

//var mainUrl = "http://liqrtiqr.com";
var mainUrl = "http://localhost:3000";


var drinks = new Array();
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
    return this.getItem(key) && JSON.parse(this.getItem(key));
}


var drinky = {
    
    weekStats:null,
    monthStats:null,
    yearStats:null,
    
    offlineAlert: {
        title: "You are Offline",
        msg: "You are currently not online and cannot perform this action"
    },
    
    loggedOutAlert: {
        title: "Please Log In",
        msg: "You are currently not logged in. You must be registered and logged in to view this page"
    },
    
    /**
     * Get drinksobj
     */
    getDrinks:function() {
        var drinksObj = localStorage.getObject('drinks');
        if (drinksObj == undefined) {
            drinksObj = new Array();
        }
        return drinksObj;
    },
    
    /**
     * Save drinks Obj
     */
    setDrinks:function(drinksObj) {
        localStorage.setObject('drinks', drinksObj);
    },
    
    setUnsyncedDrinks:function(drinksObj) {
        /*var i;
        var c=0;
        for(i=0; i<drinksObj.length; i++) {
            if (!drinksObj[i].s) {
                c++;
            }
        }
        $('#count_total').html(c);*/
    },
    
    setCounter:function(initialise) {
        var ct = drinky.getTotalDrinks(initialise);
        var str = ct+" Unit";
        if (ct!=1) {
            str+="s";
        }
        $('#unit_total').html(str);
       
    },
    
    getTotalDrinks:function(initial) {
        drink = new Array();
        var t = 0;
        //get time stamp for 12 hours ago
        var halfDay = new Date().getTime()-43200000; //12 hours limit 43200000

        //Get Drinks obj
        var drinksObj = drinky.getDrinks();
        var drink;
        
        if (initial) {
            $('.history .inner').html('');
        }

        for(key in drinksObj) {

            drink = drinksObj[key];
            if (drink.t < halfDay) {
                continue;
            }

            if (initial) {
                drinky.recordDrink(drink);
            }
	        
            if (!isNaN(drinkDb[drink.d].s)) {
                t=t+drinkDb[drink.d].s;
            }
            
        }
        
        if (initial) {
            if (drinksObj != undefined) {
                $('.history .inner').css('width', (drinksObj.length*40)+"px");
                drinky.setUnsyncedDrinks(drinksObj)
            }
        }
        
        var num = new Number(t);

        return num.toFixed(2);
    },
    
    /**
     * Called when response from server arrives
     */
    synced:function(data,a,d) {
        if (data != null && data.status == "ok") {
            //get drinks
            var drinksObj = drinky.getDrinks();
            //Remove all unsynced drinks
            
            var inner = $('.history .inner');

            //loop through stamps and mark as synced
            for(i=0; i<data.stamps.length; i++) {
                //loop through drinks and find match
                stamp = data.stamps[i];
                for (j=0; j<drinksObj.length; j++) {
                    var drinkObj = drinksObj[j];
                    if (drinkObj.t == stamp) {
                        drinkObj.s = 2;

                        $('.sml_drink.unsynced.t_'+drinkObj.t, inner).removeClass('unsynced');
                        continue;
                    }
                    
                }
            }
            drinky.setDrinks(drinksObj);
            drinky.setUnsyncedDrinks(drinksObj);
            
        }
        $.mobile.hidePageLoadingMsg();
    },
    
    getMappedDrinks: function() {
        var map = Array();
        for(drink in drinkDb) {
            map[drinkDb[drink].id] = drink;
        }
        return map;
    },
    
    loggedIn:function(data,a,d) {

        if (data.status == "ok") {
            //Store auth key
            localStorage.setItem("auth_key", data.auth_key);
            drinky.checkLogin();
            //Clear fields
            $('.login input').prop('value', '');
            
            var dm = drinky.getMappedDrinks();
            
            var drinksObj = drinky.getDrinks();
            var d;
            //Load all drinks
            if (data.drinks!=null) {
                for(drinks in data.drinks) {
                    var theDrink = data.drinks[drinks];
                    d = {
                        t: theDrink.t*1000,
        	            d: dm[theDrink.id],
        	            s: true
        	        }
        	        drinksObj.push(d);
                }
            }
            //save drinks
            drinky.setDrinks(drinksObj);
            drinky.setCounter(true);
            history.back();

        } else {
            $(".login .response").html(data.msg).slideDown();
            localStorage.removeItem("auth_key");
        }
        $.mobile.hidePageLoadingMsg();
    },
    
    registerResponse:function(data,a,d) {
        if (data.status == "ok") {
            //Store auth key
            localStorage.setItem("auth_key", data.auth_key);
            //Clear fields
            $('.register input').prop('value', '');
            drinky.checkLogin();
            history.back();

        } else {
            var errMsg = '';
            for(key in data.msg) {
                for (err in data.msg[key]) {
                    errMsg+=key+": "+data.msg[key][err]+"<br />";
                }
            }
            $(".register .response").html(errMsg).slideDown();
            localStorage.removeItem("auth_key");
        }
        $.mobile.hidePageLoadingMsg();
    },
    
    recordDrink:function(drink) {
        var classes=' t_'+drink.t;
        if (!drink.s) {
            classes+=' unsynced';
        }
        $('.history .inner').prepend("<div class='sml_drink"+classes+"'><a href='#drunk_info' data-rel='dialog' data-transition='slidedown'><img src='images/sml_"+drink.d+".png' /></a></div>")
        //Add drink object to it
        $('.history .inner div.sml_drink:first').data('info', drink);

    },
    
    /**
     * Check if we are logged in
     */
    checkLogin:function() {
        if (localStorage.getItem("auth_key") != undefined) {
            //We're lgged in
            $(".logged_in").hide();
            $(".logged_out").show();
        } else {
            $(".logged_in").show();
            $(".logged_out").hide();
        }
        
    },
	
	/**
	 * Sign out
	 */
	signOut:function() {
	    localStorage.removeItem("auth_key");
	    
	    //remove synced drinks
	    var drinksObj=localStorage.getObject('drinks');

	    var outputArr = new Array();
	    for(i=0; i<drinksObj.length; i++) {
	        if (!drinksObj[i].s) {
	            outputArr.push(drinksObj[i]);
	        }
        }
        drinky.setDrinks(outputArr);
        
        drinky.setCounter(true);
	    
	    drinky.checkLogin();
	},
	
	graphPlotWeek:function() {

        $('.the_legend').html('');
        var plot = new Array();
        var ticks = new Array();
        
        //Plot year of weeks
        for (i=51; i>=0; i--) {
            plot.push([51-i, drinky.weekStats[i]]);
            ticks.push([51-i, i+1]);
        }
        $.plot($(".graph"), [ plot ], {
            xaxis: {
                ticks: ticks
            },
            bars: { show: true },
            legend: { 
                container: '.the_legend',
                show: false, 
                
            }
        });
        console.log("Sizes", plot.length, ticks.length)
	},
	
	graphPlotCompareMonth:function() {
        var yearStr = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun', 
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        //Get number of months we are showing
        var numMonths = drinky.compareStats.length;
        var months = new Array();
        var lastTotal = 0;
        var d = new Date().getDate();

        //var m, i;
        for (m=0; m<numMonths; m++) {
            var cMonth = new Array();
            cMonth.data = new Array();
            thisTotal = 0;
            for (i=0; i<31; i++) {
                thisTotal += drinky.compareStats[m][i]/100;

                cMonth.data.push([i, thisTotal]);
            }

            cMonth.label = yearStr[new Date(new Date().setMonth(new Date().getMonth()-m)).getMonth()];

            months.push(cMonth);
        }

        var ticks = new Array();
	    //Plot Month
        for (i=0; i<31; i++) {
            if (i%5==0) {
                ticks.push([i, i]);
            } 
        }
        $.plot($(".graph"), months, {
            xaxis: {
                ticks: ticks
            },
            legend: {
                noColumns: 1,
                container: '.the_legend',
                position: 'right'
            }
           
        });
	},
	
	graphPlotMonth:function() {
        $('.the_legend').html('');
	    var plot = new Array();
        var ticks = new Array();
	    //Plot Month
        for (i=0; i<28; i++) {
            plot.push([i, drinky.monthStats[i][1]]);
            if (i%5==0) {
                ticks.push([i, drinky.monthStats[i][0]]);
            } else {
//                    ticks.push([i, '');
            }
            
            
        }
        $.plot($(".graph"), [ plot ], {
            xaxis: {
                ticks: ticks
            },
            bars: { show: true }
        });
	},
	
	graphPlotYear:function() {
        $('.the_legend').html('');
	    var plot = new Array();
        var ticks = new Array();
        var yearStr = ['j', 'f', 'm', 'a', 'm', 'j', 'j', 'a', 's', 'o', 'n', 'd']
	    //Plot Month
        for (i=0; i<12; i++) {
            plot.push([i, drinky.yearStats[i][1]]);
            ticks.push([i, yearStr[drinky.yearStats[i][0]-1]]);
        }
        $.plot($(".graph"), [ plot ], {
            xaxis: {
                ticks: ticks
            },
            bars: { show: true }
        });
	},
	
	statsResponse:function(data,a,d) {
        if (data.status == "ok") {
            $.mobile.changePage("#my_stats")
	        //Weeks
	        drinky.weekStats = data.week;
	        //Month Stats
	        drinky.monthStats = data.month;
	        //Year Stats
	        drinky.yearStats = data.year;
	        //Compare Stats
	        drinky.compareStats = data.comp;
	        

            var plot = new Array();
            var ticks = new Array();

            $.plot($(".graph"), [ plot ], {
                xaxis: {
                    ticks: ticks
                }
            });
            
	    }
	    $.mobile.hidePageLoadingMsg();
	},
	
	validateLogin: function(data,a,d) {
        if (data.status == "ok") {
            //login ok
        } else {
            //Invalidate login
            localStorage.removeItem("auth_key");
        }
        drinky.checkLogin();
        $.mobile.hidePageLoadingMsg();
	},
	
	showDialog: function(obj) {
	    var dialog = $('#alert');
        //Set title
        $("h1", dialog).html(obj.title);
        $("p", dialog).html(obj.msg)
        $.mobile.changePage($('#alert'), 'slidedown', false, true);
	},
	
	init:function() {
        
        //Init Modernizr
	    //Modernizr.load();
	    
	    var authKey = localStorage.getItem('auth_key');
	    if (authKey!=undefined && navigator.onLine) {
	        $.mobile.showPageLoadingMsg();
            $.ajax({
              type: 'POST',
              url: mainUrl+'/validate_login/'+authKey+".json",
              data: false,
              success: drinky.validateLogin,
              dataType: 'json'
            });

        } else {
            drinky.checkLogin();
        }

	    $('div.drinks a').click(function() {
	        var now = new Date().getTime();
            var drink = $(this).attr('id');
	        //localStorage.setItem(now, drink);
	        var drinkObj = {
	            t: now,
	            d: drink,
	            s: false
	        }
	        var drinksObj = drinky.getDrinks();

	        drinksObj.push(drinkObj);

	        drinky.setDrinks(drinksObj)
	        
	        drinks[drink] = drinks[drink]+drinkDb[drink].s;
	        drinky.setCounter();
	        
	        drinky.recordDrink(drinkObj);
	        
	        $('.history .inner').css('width', (drinksObj.length*40)+"px");
	        drinky.setUnsyncedDrinks(drinksObj)

	        return false;
	    });
	    
/*	    $('button.clear_button').click(function() {
	        var answer = confirm("Clear all unsynced drinks?")
            if (answer){
	            localStorage.clear();
	            drinky.setCounter();
	            
	            drinky.setUnsyncedDrinks(new Array());
	            $('.history .inner').html('');
            }
	    });*/
	    
	    $('#sync_but').click(function() {
	        if (navigator.onLine) {
                $.mobile.showPageLoadingMsg();
    	        //build data
    	        var data;
    	        var prefix = 'dr_'
	        
    	        var tmpDrinks = new Object();
	        
    	        var drinksObj = drinky.getDrinks();
    	        var keepDrinks = Array();

    	        var now = new Date().getTime()-43200000;
            
    	        //get all unsynced drinks
    	        for(i=0; i<drinksObj.length; i++) {
                    drink = drinksObj[i];

                    //check if we've tried to sync it before
                    if (!drink.s) {
                    
                        if(tmpDrinks[prefix+drink.d]==undefined) {
                            tmpDrinks[prefix+drink.d] = new Array();
                        }
                    
                        tmpDrinks[prefix+drink.d].push(drink.t);
                        //set drinks to syncing
                        drink.s = 1;
                    }
                    
                    //See if we should remove
                    if (drink.t < now) {
                        //if synced then delete
                        if (drink.s > 1) {
    
                        } else {
                            //keep it
                            keepDrinks.push(drink);
                        }
                        //Hide it
                        $('.history .inner .t_'+drink.t).remove();
                    } else {
                        keepDrinks.push(drink);
                    }
                
                }
            
                //save drinkObj
                drinky.setDrinks(keepDrinks);
            
    	        //Post
                $.ajax({
                  type: 'POST',
                  url: mainUrl +'/sync/'+localStorage.getItem("auth_key")+'.json',
                  data: tmpDrinks,
                  success: drinky.synced,
                  dataType: 'json'
                });

            } else {
                //Not online
                drinky.showDialog(drinky.offlineAlert);
            }
            
	    });

        $('.login_button').click(function() {
            $(".login .response").slideUp();
            $.mobile.showPageLoadingMsg();

            $.ajax({
              type: 'POST',
              url: mainUrl+'/login.json',
              data: $('.login input').serialize(),
              success: drinky.loggedIn,
              dataType: 'json'
            });

            
            return false;
        });
        
        $('.register_button').click(function() {
            $(".register .response").slideUp();
            $.mobile.showPageLoadingMsg();
            $.post(
                mainUrl +
                '/signup',
                $('.register input').serialize(),
                drinky.registerResponse,
                'json'
                );
            return false;
        })
        
        //Small drinnk click
        $('.sml_drink').live('click', function() {

            var targetDrink = $(this);
            var drinkObj = $(this).data('info');
            var page = $('#drunk_info');
            
            var newDate = new Date( );
            newDate.setTime( drinkObj.t );
            dateString = newDate.toLocaleString( );

            $('img', page).attr('src', "images/sml_"+drinkObj.d+".png")
            $('p span.drink_name', page).html(drinkObj.d);
            $('p span.drink_time', page).html(dateString);
            
            $('.delete_drink').unbind('click');
            //Add delete back
            $('.delete_drink').click(function() {
                //Delete this item from the drinks
                var drinksObj = drinky.getDrinks();
                var newDrinkObj = Array();

                for(key in drinksObj) {
                    testDrink = drinksObj[key];
                    if (testDrink.t != drinkObj.t) {
                        newDrinkObj.push(testDrink);
                    } else {
                        deleteDrinksObj = testDrink;
                    }
                }
                //Push drinks
                drinky.setDrinks(newDrinkObj);
                
                var authId = localStorage.getItem('auth_key');
                
                if (authId!=null && deleteDrinksObj.s==2) {
                    //Send delete
                    $.post(
                        mainUrl +
                        '/delete/'+localStorage.getItem('auth_key')+'/'+deleteDrinksObj.t,
                        null,
                        drinky.deleteSync,
                        'json'
                        );
                }
                targetDrink.remove();

                $('.ui-dialog').dialog('close');
                
                drinky.setCounter(false);
            })
            
            return false;
        });
        
        //signout button
        $('#sign_out_but').click(function() {
            drinky.signOut();
        });
        
        $('#stats_button').click(function() {
            
            //Load Stats
            var auth_key = localStorage.getItem("auth_key");
            
            if (navigator.onLine) {
                
                if (auth_key == null) {
                    //Show logged in alert
                    drinky.showDialog(drinky.loggedOutAlert);
                    return false;
                } else {
                    
                    $.ajax({
                      type: 'POST',
                      url: mainUrl + '/my_stats/'+localStorage.getItem("auth_key")+'.json',
                      data: '',
                      success: drinky.statsResponse,
                      dataType: 'json'
                    });

                    $.mobile.showPageLoadingMsg();
                    return false;

                }
            } else {
                drinky.showDialog(drinky.offlineAlert);
                return false;
            }
            

        });
        
        $('#week_graph').click(function() {
            drinky.graphPlotWeek()
        });
        
        $('#month_graph').click(drinky.graphPlotMonth);
        $('#compare_graph').click(drinky.graphPlotCompareMonth);
        
        $('#year_graph').click(drinky.graphPlotYear);
        
        $('#main_footer').delay(2000).animate({opacity: 1});
        $('.drinks').delay(2000).animate({opacity: 1});

        drinky.setCounter(true);
        

    }
}

$(document).ready(drinky.init);