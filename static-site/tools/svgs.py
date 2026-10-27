import re, json
s = open('zip/cinetica_website (1)/www.cinetica.studio/index.html').read()
out = {}
for key, pat in {
    'service_arrow': r'<div class="services-tab__svg-wrapper">(<svg.*?</svg>)</div>',
    'work_arrow': r'<div class="work-item__svg-wrapper">(<svg.*?</svg>)</div>',
    'marquee_star': r'<p class="marquee-css__item-p">[^<]*</p>(<svg.*?</svg>)</div>',
    'instagram': r'aria-label="instagram"[^>]*>(<svg.*?</svg>)</a>',
    'cursor': r'<div class="cursor-svg__wrapper">(<svg.*?</svg>)</div>',
    'send': r'<button id="chat-send-btn" class="chat-send-btn">(<svg.*?</svg>)</button>',
    'hw_svg': r'<div data-reveal-type="scale" data-reveal="true" class="horizontal-words_svg">(<svg.*?</svg>)</div>',
    'services_svg': r'<div class="services-svg__wrapper">(<svg.*?</svg>)</div>',
    'play': r'<div class="vimeo-lightbox__btn is--placeholder">(<svg.*?</svg>)</div>',
    'work_center': r'<div class="_3-grid">.*?<div class="flex-h cc">(<svg.*?</svg>)</div>',
}.items():
    m = re.search(pat, s, re.S)
    out[key] = m.group(1)
    print(key, len(m.group(1)))
json.dump(out, open('svgs.json', 'w'))
