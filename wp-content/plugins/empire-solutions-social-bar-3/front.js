jQuery(document).ready(function($) {

  // --------------------------------------------------------------------
  // A) Definim containerele forțate și modul dorit (white / black / gradient)
  // --------------------------------------------------------------------
  const FORCED_MODES = [
    // 1) Alb când e vizibil containerul .elementor-element-5c4ae11a
    { selector: '.elementor-element-5c4ae11a', mode: 'white' },

    // 2) Negru când e vizibil containerul .elementor-element-40afa55c
    { selector: '.elementor-element-40afa55c', mode: 'black' },

    // 3) Gradient când e vizibil containerul .elementor-element-5507ad32
    { selector: '.elementor-element-5507ad32', mode: 'gradient' },

    // 4) Alb când e vizibil containerul .elementor-element-6f71f493
    { selector: '.elementor-element-6f71f493', mode: 'white' }

    // Restul secțiunilor rămân autodetect
  ];

  // --------------------------------------------------------------------
  // B) Setăm un offset pentru „detecție la jumătate de ecran” (sau alt procent)
  //    – scade dacă vrei să devină "vizibil" mai devreme (ex. 0.3)
  // --------------------------------------------------------------------
  const VISIBILITY_OFFSET = 0.5;

  // --------------------------------------------------------------------
  // Praguri pentru autodetect (near-white => black, near-black => white)
  // --------------------------------------------------------------------
  const BRIGHTNESS_THRESHOLD_HIGH = 210; 
  const BRIGHTNESS_THRESHOLD_LOW  = 50;  

  // --------------------------------------------------------------------
  // Funcții auxiliare: parseColor, brightness, sampling
  // --------------------------------------------------------------------
  function parseColor(str){
    const rgbRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)\)/;
    let m = str.match(rgbRegex);
    if(m){
      return {
        r: parseInt(m[1],10),
        g: parseInt(m[2],10),
        b: parseInt(m[3],10)
      };
    }
    return {r:255, g:255, b:255}; // fallback alb
  }

  function getDominantBG(elem){
    let bg = window.getComputedStyle(elem).backgroundColor;
    while( (bg==='transparent' || bg==='rgba(0, 0, 0, 0)') && elem.parentElement ){
      elem = elem.parentElement;
      bg = window.getComputedStyle(elem).backgroundColor;
    }
    return bg;
  }

  function brightness(c){
    return (c.r*299 + c.g*587 + c.b*114)/1000; // 0..255
  }

  // Eșantionează fundalul de sub bar, 5×5 puncte
  function sampleBar($bar){
    if(!$bar.length) {
      return {r:255, g:255, b:255};
    }
    let rect = $bar[0].getBoundingClientRect();
    let points = [];
    for(let i=0; i<5; i++){
      for(let j=0; j<5; j++){
        let x = rect.left + rect.width*(j/5);
        let y = rect.top  + rect.height*(i/5);
        $bar.css('visibility','hidden');
        let el = document.elementFromPoint(x,y);
        $bar.css('visibility','visible');
        if(el){
          points.push( parseColor(getDominantBG(el)) );
        }
      }
    }
    let sum = {r:0,g:0,b:0};
    points.forEach(c=>{
      sum.r += c.r; sum.g += c.g; sum.b += c.b;
    });
    let n = points.length || 1;
    return {
      r: Math.round(sum.r/n),
      g: Math.round(sum.g/n),
      b: Math.round(sum.b/n)
    };
  }

  // --------------------------------------------------------------------
  // Funcția de vizibilitate personalizată cu offset
  // Considerăm un container "vizibil" dacă ORIZONTA liniei
  // plasate la (offset * window.innerHeight) intersectează boundingRect
  // --------------------------------------------------------------------
  function isVisible(el) {
    if(!el) return false;
    let rect = el.getBoundingClientRect();
    let lineY = window.innerHeight * VISIBILITY_OFFSET; 
    // condiție: containerul e "vizibil" dacă rect.top < lineY && rect.bottom > lineY
    return (rect.top < lineY && rect.bottom > lineY);
  }

  // --------------------------------------------------------------------
  // Verificăm, în ordinea FORCED_MODES, dacă e vizibil un container ce forțează mod
  // --------------------------------------------------------------------
  function checkForcedMode(){
    for(let item of FORCED_MODES){
      let el = document.querySelector(item.selector);
      if(isVisible(el)){
        return item.mode; 
      }
    }
    return null;
  }

  // --------------------------------------------------------------------
  // Funcția principală: determinăm modul barei
  // --------------------------------------------------------------------
  let lastMode = '';

  function detectMode(){
    let $bar = $('.es-social-bar');
    if(!$bar.length) return;

    // 1) Vezi dacă un container forțează un mod
    let forced = checkForcedMode();
    if(forced){
      // forced e "white" / "black" / "gradient"
      if(lastMode !== forced){
        $bar.removeClass('es-mode-white es-mode-black es-mode-gradient');
        $bar.addClass('es-mode-' + forced);
        lastMode = forced;
      }
      return; // Oprim, nu mai facem autodetect
    }

    // 2) Dacă nimic forțat nu e vizibil => autodetect
    let avg = sampleBar($bar);
    let br = brightness(avg);
    let mode;
    if(br >= BRIGHTNESS_THRESHOLD_HIGH){
      mode = 'black';  
    } else if(br <= BRIGHTNESS_THRESHOLD_LOW){
      mode = 'white';  
    } else {
      mode = 'gradient';
    }

    if(mode !== lastMode){
      $bar.removeClass('es-mode-white es-mode-black es-mode-gradient');
      $bar.addClass('es-mode-' + mode);
      lastMode = mode;
    }
  }

  // --------------------------------------------------------------------
  // Ajustează dimensiunile barei (dacă există ES_RESIZE_SETTINGS)
  // --------------------------------------------------------------------
  if(typeof ES_RESIZE_SETTINGS !== 'undefined') {
    let iconSize = ES_RESIZE_SETTINGS.iconSize || 16;
    let textSize = ES_RESIZE_SETTINGS.textSize || 12;
    $('.es-social-bar').css({
      '--icon-size': iconSize + 'px',
      '--follow-text-size': textSize + 'px',
      '--line-height': 'calc(' + iconSize + 'px + 10px)'
    });
  }

  // --------------------------------------------------------------------
  // Evenimente: rulăm detectMode la load/scroll/resize etc.
  // --------------------------------------------------------------------
  $(window).on('load scroll resize orientationchange', detectMode);
  detectMode();
});
