/*
 * FlatTurtle
 * @author: Jens Segers (jens@irail.be)
 * @license: AGPLv3
 */

(function($) {

    var collection = Backbone.Collection.extend({
        initialize : function(models, options) {
            // prevents loss of 'this' inside methods
            _.bindAll(this, "refresh", "configure");

            // bind events
            this.on("born", this.configure);
            this.on("born", this.refresh);
            this.on("refresh", this.refresh);
            this.on("reconfigure", this.configure);

            // default error value
            options.error = false;

            // default limit
            if (!options.limit)
                options.limit = 5;

            // automatic collection refresh each minute, this will
            // trigger the reset event
            refreshInterval = window.setInterval(this.refresh, 60000);
        },
        configure : function() {
            // Walking time
            var hours = Math.floor(this.options.time_walk/60);
            var minutes = Math.floor(this.options.time_walk%60);
            if(hours == 0 && minutes == 0){
                this.options.time_walk = "< 1 min";
            }else if(this.options.time_walk < 0){
                this.options.time_walk = false;
            }else{
                if(hours< 10) hours = '0' + hours;
                if(minutes< 10) minutes = '0' + minutes;
                this.options.time_walk = hours + ':' + minutes;
            }
            this.trigger("reset");

            // don't fetch if there is no location
            if (this.options.location == null || !this.options.location)
                return;

            if(isNaN(this.options.location))
                this.options.station = this.options.location.capitalize();

            var self = this;
            $.getJSON("http://data.irail.be/DeLijn/Stations.json?name=" + encodeURIComponent(this.options.station), function(data) {
                if (data.Stations[0] != undefined) {
                    self.options.station = data.Stations[0].name.capitalize();
                    self.trigger("reset");
                }
            });
        },
        refresh : function() {
            // don't fetch if there is no location
            if (this.options.location == null || !this.options.location)
                return;

            var self = this;
            self.fetch({
                error : function() {
                    // will allow the view to detect errors
                    self.options.error = true;

                    // if there are no previous items to show, display error message
                    if(self.length == 0)
                        self.trigger("reset");
                }
            });
        },
        url : function() {
            var today = new Date();
            var query = encodeURIComponent(this.options.location) + "/" + today.format("{Y}/{m}/{d}/{H}/{M}");

            // remote source url - todo: add departures or arrivals
            return "http://data.irail.be/DeLijn/Departures/" + query + ".json?offset=0&rowcount=" + parseInt(this.options.limit);
        },
        parse : function(json) {
            // this.options.station = json.Departures.location.name;
            // parse ajax results
            var liveboard = json.Departures;

            for (var i in liveboard) {
                var time = new Date(liveboard[i].time * 1000);
                liveboard[i].time = time.format("{H}:{M}");

                if (liveboard[i].delay) {
                    var delay = new Date(liveboard[i].delay * 1000 + time.getTimezoneOffset() * 60000);
                    liveboard[i].delay = delay.format("{H}:{M}");
                }

                if (!liveboard[i].long_name) {
                    liveboard[i].long_name = "-";
                } else {
                    liveboard[i].long_name = liveboard[i].long_name.capitalize();

                    if (liveboard[i].long_name.split("-").length == 2)
                        liveboard[i].long_name = liveboard[i].long_name.split("-")[1];
                }

                switch (parseInt(liveboard[i].type)) {
                    case 0:
                        liveboard[i].type = "tram";
                        break;
                    default:
                        liveboard[i].type = "bus";
                        break;
                }
            }

            return liveboard;
        },
        parseTripName: function (strTripName) {
            strTripName = strTripName.capitalize();

            if(strTripName.split("-").length == 2) {
                strTripName = strTripName.split("-")[1];
            }

            return strTripName;
        }
    });

    var view = Backbone.View.extend({
        initialize : function() {
            // prevents loss of 'this' inside methods
            _.bindAll(this, "render");

            // bind render to collection reset
            this.collection.on("reset", this.render);

            // pre-fetch template file and render when ready
            var self = this;
            if (this.template == null) {
                $.get("turtles/delijn/views/list.html", function(template) {
                    self.template = template;
                    self.render();
                });
            }
        },
        render : function() {
            // only render when template file is loaded
            if (this.template) {
                var data = {
                    station : this.options.station || this.options.location,
                    entries : this.collection.toJSON(),
                    color : this.options.color,
                    time_walk : this.options.time_walk,
                    error : this.options.error // have there been any errors?
                };

                // add html to container
                this.$el.empty();
                this.$el.html(Mustache.render(this.template, data));
            }
        }
    });

    // register turtle
    Turtles.register("delijn", {
        collection : collection,
        view : view
    });

})(jQuery);