! function (a) {
    "use strict";
    a.fn.anarchytip = function (b) {
        var c = a.extend({
            xOffset: 10,
            yOffset: 30
        }, b);
        return this.each(function () {
            var b = a(this);
            b.hover(function (b) {
                this.t = this.title, this.title = "";
                var d = "" != this.t ? "<br/>" + this.t : "";
                console.log(b, this)
                a("body").append("<p id='imagepreview'><img src='" + (this.href || (this.dataset ? this.dataset['url'] : '')) + "' alt='Image imagepreview' />" + d + "</p>"), a("#imagepreview").css({
                    top: b.pageY - c.xOffset + "px",
                    left: b.pageX + c.yOffset + "px"
                }).fadeIn()
            }, function () {
                this.title = this.t, a("#imagepreview").remove()
            }), b.mousemove(function (b) {
                a("#imagepreview").css("top", b.pageY - c.xOffset + "px").css("left", b.pageX + c.yOffset + "px")
            })
        })
    }
}(jQuery);