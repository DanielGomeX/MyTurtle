/*
 * The panes object will take care of the interface elements and colors
 */
window.Interface = (function() {

    /*
     * Execute all functions for passed config
     */
    function setup(config) {
        if (config.color)
            color(config.color);
        
        if (config.logo)
            logo(config.logo);
        
        if (config.footer)
            footer(config.footer);
    }
    
    /*
     * Change the ui color
     */
    function color(value) {
        // style element
        var custom = $('body style#custom');
        if (custom.length == 0) {
            custom = $('<style type="text/css" id="custom"></style>');
            $('body').prepend(custom);
        }
        
        // custom styles
        var style = ".text-color { color: " + value + "; }\n"
                  + ".bg-color { background-color: " + value + "; }\n"
                  + ".bg-color-light { background-color: " + tinycolor.desaturate(tinycolor.lighten(value)) + "; }\n"
                  + ".bg-color-dark { background-color: " + tinycolor.darken(value) + "; }\n"
                  + ".border-color { border-color: " + value + " transparent; }\n";
        
        // add to body
        custom.html(style);
    }
    
    /*
     * Set the footer logo url
     */
    function logo(url) {
        $('footer img#client-logo').attr('src', url);
    }
    
    /*
     * Set the footer message
     */
    function footer(value) {
        $('footer #where').html(value);
    }

    /*
     * Public interface to this object
     */
    return {
        setup : setup,
        color : color,
        logo : logo,
        footer : footer
    };

}());