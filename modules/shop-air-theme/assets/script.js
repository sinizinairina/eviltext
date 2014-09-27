(function(){
  Spinner.defaults = {
    lines: 9, length: 4, width: 2, radius: 4, corners: 1, rotate: 0, direction: 1,
    color: '#000', speed: 1, trail: 60, shadow: false, hwaccel: false, className: 'spinner',
    zIndex: 2e9, top: 'auto', left: 'auto'
  }

  var showProgress = function($el){
    var spinnerEl = document.createElement('span')
    spinnerEl.style.position = 'relative'

    // Have no idea why it should be divided by 4 instead of 2 but somehow this works.
    spinnerEl.style.top      = '-' + ($el.height() / 4) + 'px'
    spinnerEl.style.left     = ($el.width() / 4) + 'px'

    $el[0].appendChild(spinnerEl)
    var spinner = new Spinner().spin(spinnerEl)

    return function(){
      spinner.stop()
      $(spinnerEl).remove()
    }
  }

  $(document).on('click', '.js-product-image', function(e){
    e.preventDefault()
    var $imageContainer = $(this)
    var $image = $imageContainer.find('img')
    var $product = $imageContainer.parents('.js-product')
    var $selectedImage = $product.find('.js-product-selected-image img')

    // Checking if image already shown.
    if($selectedImage.attr('src') === $image.attr('src')) return

    // Adding progress.
    var hideProgress = showProgress($imageContainer)
    $image.hide()
    var onLoad = function(){
      hideProgress()
      $image.show()
      $selectedImage.off('load', onLoad)
    }
    $selectedImage.on('load', onLoad)

    $selectedImage.attr('src', $image.attr('src'))
  })
})()