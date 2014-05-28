
(function($) {

    var collection = Backbone.Collection.extend(
    {
        initialize : function(models, options)
        {
            log.debug("TURTLE - NAVITIA - Initialize");
            _.bindAll(this, "refresh", "configure");

            this.on("born", this.configure);
            this.on("born", this.refresh);
            this.on("refresh", this.refresh);
            this.on("reconfigure", this.configure);

            // default limit
            if (!options.limit)
            {
                options.limit = 5;
            }

            // default error value
            options.error = false;

            this.options = options;
            var self = this;

            // automatic collection refresh each minute, this will
            // trigger the reset event
            setTimeout(function(){
                refreshInterval = setInterval(self.refresh, 60000);
            }, Math.round(Math.random()*5000));

    },
    configure : function(){
            log.debug("TURTLE - NAVITIA - Configure"); 
            var self = this;

            // Walking time
            if(this.options.time_walk >= 0){
                this.options.time_walk = formatTime(this.options.time_walk);
                this.trigger("reset");
            }else{
                this.options.time_walk = false;
            }
            // stop point mode
            if (this.options.stop_point != "")
            {
                $.getJSON("https://api.navitia.io/v1/coverage/" + this.options.region + "/stop_points/" + this.options.stop_point, function(data)
                {
                    self.options.latitude = parseFloat(data.stop_points[0].coord.lat);
                    self.options.longitude = parseFloat(data.stop_points[0].coord.lon);
                    self.options.location = data.stop_points[0].name.capitalize();
                });

                // fetch data
                self.fetch();
            }

            // stop area mode
            else if (this.options.stop_area != "")
            {
                $.getJSON("https://api.navitia.io/v1/coverage/" + this.options.region + "/stop_areas/" + this.options.stop_area, function(data)
                {
                    self.options.latitude = parseFloat(data.stop_areas[0].coord.lat);
                    self.options.longitude = parseFloat(data.stop_areas[0].coord.lon);
                    self.options.location = data.stop_areas[0].name.capitalize();
                });

                // fetch data
                self.fetch();
            }

            // search mode
            else
            {
                $.getJSON("https://api.navitia.io/v1/coverage/" + this.options.region + "/places?q=" + encodeURIComponent(this.options.location) + "&type[]=stop_area&count=1", function(data)
                {
                    self.options.stop_area = data.places[0].stop_area.id;
                    self.options.latitude = parseFloat(data.places[0].stop_area.coord.lat);
                    self.options.longitude = parseFloat(data.places[0].stop_area.coord.lon);

                    // fetch data
                    self.fetch();
                });
            }

        },
        refresh : function(){
            log.debug("TURTLE - NAVITIA - Refresh");
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

        url : function()
        {
            log.debug("TURTLE - NAVITIA - Create URL");
            var d = new Date;
            var query = d.format("{Y}{m}{d}T{H}{M}{S}");

            if (this.options.stop_point)
            {
                return "https://api.navitia.io/v1/coverage/" + this.options.region + "/stop_points/" + this.options.stop_point + "/departures?from_datetime=" + query;
            }
            else if (this.options.mode)
            {
                return "https://api.navitia.io/v1/coverage/" + this.options.region + "/stop_areas/" + this.options.stop_area + "/commercial_modes/commercial_mode:" + this.options.mode.toLowerCase() + "/departures?from_datetime=" + query;
            }
            else
            {
                if(this.options.stop_area == "")
                    return "https://api.navitia.io/v1/coverage/" + this.options.region;
                return "https://api.navitia.io/v1/coverage/" + this.options.region + "/stop_areas/" + this.options.stop_area + "/departures?from_datetime=" + query;
            }
        },

        parse : function(json)
        {
            log.info("TURTLE - NAVITIA - Parse results");
            var liveboard = json.departures;
            var lines = new Array();
          
            for (var i in liveboard)
            {
            	// set lng lat
            	if (!this.options.latitude || !this.options.longitude)
            	{
            		this.options.latitude = parseFloat(liveboard[i].stop_point.coord.lat);
            		this.options.longitude = parseFloat(liveboard[i].stop_point.coord.lon);
            		this.options.location = liveboard[i].stop_point.name.capitalize();
            	}

            	// use gray as default background color
            	if (liveboard[i].route.line.color == "FFFFFF")
            	{
            		liveboard[i].route.line.color = "555555";
            	}

                // No all caps
                if (liveboard[i].route.name == liveboard[i].route.name.toUpperCase())
                {
                    liveboard[i].route.name = liveboard[i].route.name.capitalize();
                }

            	// set time
            	// A date time from the API comes in the format: YYYYMMDDTHHMMSS
            	var time = liveboard[i].stop_date_time.departure_date_time.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/,'$4:$5');
                liveboard[i].time = time;

                // increment line popularity
                lines[liveboard[i].route.line.code] = lines[liveboard[i].route.line.code] ? lines[liveboard[i].route.line.code]+1 : 1;
            }

            // select the most popular line
            var max = 0; var selected;
            for (var line in lines)
            {
                if (lines[line] > max)
                {
                    selected = line;
                    max = lines[line];
                }
            }

            // choose the icon based on the line
            if (typeof selected == 'string')
            {
                if (selected.length == 1)
                {
                    if (selected >= 'A' && selected <= 'E') this.options.icon = "rer";
                    else if (selected >= 'H' && selected <= 'U') this.options.icon = "train";
                    else this.options.icon = "bus";
                }
                else
                {
                    if (selected.charAt(0) == 'T') this.options.icon = "tram";
                    else this.options.icon = "bus";
                }
            }
            else if (selected)
            {
                if (selected <= 14) this.options.icon = "metro";
                else this.options.icon = "bus";
            }

            return liveboard;
        }
    });

    var view = Backbone.View.extend(
    {
        initialize : function(options)
        {

            // prevents loss of "this" inside methods
            _.bindAll(this, "render");
            
            // bind render to collection reset
            this.collection.on("reset", this.render);

            // pre-fetch template file and render when ready
            var self = this;
            if (this.template == null) {
                $.get("turtles/navitia/views/list.html", function(template) {
                    self.template = template;
                    self.render();
                });
            }      
        },
        render : function()
        {
            // only render when template file is loaded
            if (this.template) {
               
                var entries = this.collection.toJSON();
                if(entries.length > 0){
                    entries.length = this.options.limit;

                    var data = {
                        location: this.options.location,
                        type: this.options.icon,
                        entries: entries,
                        time_walk : this.options.time_walk,
                        empty: this.collection.length == 0,
                        underConstruction: this.options.stop_point == 'stop_point:RTF:SP:BAGNE1' 
                    };

                    // add html to container
                    this.$el.empty();
                    this.$el.html(Mustache.render(this.template, data));
                }
            }        
        },
    });

    // register turtle
    Turtles.register("navitia", {
        collection : collection,
        view : view
    });

})(jQuery);
