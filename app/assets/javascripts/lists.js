$(document).ready(function() {
  var lastLocationSearch = "";
  var lastEstablishmentSearch = "";
  setInterval(function() {
    currentLocationSearch = $('#location').val();

    if (currentLocationSearch != lastLocationSearch) {
      lastLocationSearch = currentLocationSearch;
      callGoogle(currentLocationSearch);
      $("#add-establishments").removeAttr("disabled");
      $(".establishment-search-button").removeClass("disabled");
    }
  }, 100);

  $(".save-button").click(function() {

    var whatMatters = $("#what-matters-list").children();
    var whatMattersList = [];
    for (var i = 0; i < whatMatters.length; i++) {
      whatMattersList.push($(whatMatters[i]).attr("data-tag"));
    }

    // var notImportant = $("#not-important-list").children();
    // var notImportantList = [];
    // for (var i = 0; i < notImportant.length; i++) {
    //   notImportantList.push($(notImportant[i]).attr("data-tag"));
    // }

    var establishments = $("h4");
    var establishmentsList = [];
    for (var i = 0; i < establishments.length; i++) {
      establishmentsList.push(
        {
          name: $(establishments[i]).text(),
          image: $(establishments[i]).attr("data-image"),
          location: $(establishments[i]).attr("data-location"),
          score: $(establishments[i]).siblings(".slider").children(".dragger").text()
        }
      )
    }

    $.ajax({
      'url': $("form").attr("action"),
      'method': 'post',
      'dataType': 'json',
      'data': {
        title: $("#title").val(),
        description: $("#description").val(),
        matters: whatMattersList,
        // notImportant: notImportantList,
        establishments: establishmentsList
      }
    })
    .done(function(data) {
      window.location = data.path;
    })
  });

  $(".establishment-search-button").click(function() {
    currentEstablishmentSearch = $('#add-establishments').val();
    callYelp(currentEstablishmentSearch);
  });

  var callGoogle = function(term) {
    var callGoogleUrl = $("#location").attr("data-url");
    $.ajax({
      'url': callGoogleUrl,
      'dataType': 'json',
      'data': { term: term }
    })
    .done(function(data) {
      raw_cities = data.results.predictions;
      var cities = [];
      for (var i = 0; i < raw_cities.length; i++) {
        cities.push(raw_cities[i].description);
      }
      $('#location').autocomplete({
        source: cities
      });
    });
  }

  var callYelp = function(term) {
    var auth = null;
    var authDetailsUrl = $("#add-establishments").attr("data-url");
    var searchLocation = $("#location").val();

    $.ajax({
      url: authDetailsUrl,
      method: "get",
      dataType: "json"
    })
    .done(function(data) {
      auth = data.auth;
      var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
      };
      var terms = term;
      var near = searchLocation;

      parameters = [];
      parameters.push(['term', terms]);
      parameters.push(['location', near]);
      parameters.push(['callback', 'cb']);
      parameters.push(['oauth_consumer_key', auth.consumerKey]);
      parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
      parameters.push(['oauth_token', auth.accessToken]);
      parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

      var message = { 
        'action': 'http://api.yelp.com/v2/search',
        'method': 'GET',
        'parameters': parameters 
      };

      OAuth.setTimestampAndNonce(message);
      OAuth.SignatureMethod.sign(message, accessor);

      var parameterMap = OAuth.getParameterMap(message.parameters);
      parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature)

      $.ajax({
        'url': message.action,
        'data': parameterMap,
        'cache': true,
        'dataType': 'jsonp',
        'jsonpCallback': 'cb',
        'success': function(data, textStats, XMLHttpRequest) {
          raw_establishments = data.businesses;
          var establishments = [];
          for (var i = 0; i < Math.min(raw_establishments.length, 5); i++) {
            establishments.push(raw_establishments[i].name);
            $(".search-results-list").append("<li><a href='#' class='establishment-result' data-image='" + raw_establishments[i].image_url + "' data-location='" + searchLocation + "' data-yelp-id='" + raw_establishments[i].id + "'>" + raw_establishments[i].name + "</a></li>");
          }
          $(".establishment-result").click(function(e) {
            e.preventDefault();
            var yelpId = $(this).attr("data-yelp-id");
            var image = $(this).attr("data-image");
            var establishmentLocation = $(this).attr("data-location");

            $(".selected-results-list").append("<li><h4 data-location='" + establishmentLocation + "' data-image='" + image + "' >" + $(this).text() + "<a href='#' class='establishment-close' style='margin-left: 5px; color: black;'>&times;</a></h4><input class='selected-slider " + yelpId + "'></input></li>");
            $("." + yelpId).simpleSlider();
            $("." + yelpId).siblings(".slider").children(".dragger").text("0");

            $(".establishment-close").click(function(e) {
              e.preventDefault();
              $(this).parent().parent().remove()
            });

            $(".search-results-list li").remove();

            $(".selected-slider").bind("slider:changed", function (event, data) {
              console.log(data.value);
              $(this).siblings(".slider").children(".dragger").text(Math.ceil(data.value * 100));
            });
          });
        }
      });
    });
  }
});