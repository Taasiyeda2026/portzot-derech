#!/usr/bin/env python3
"""Render both languages from the same domain template. No runtime content API."""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HUES = [335, 205, 38, 270, 165, 18, 230, 125, 355, 185]
ICONS = ['🧘‍♀️', '📱', '👩‍🏫', '👩‍❤️‍👩', '💸', '🏃‍♀️', '🏠', '🌿', '🎨', '🔮']
COPY = {
 'he': dict(brand='פורצות דרך', home='עמוד הבית', all='לכל התחומים', language='בחירת שפה',
   main='כתבה מרכזית', closeup='מבט מקרוב', thoughts='רגע למחשבה...', count='8 כתבות קצרות לקריאה חופשית',
   read='להמשך קריאה ←', close='סגירה', prev='לכתבה הקודמת', next='לכתבה הבאה',
   source='מקורות לקריאה נוספת', photo='צילום', license='רישיון שימוש', illustration='צילום להמחשה',
   index_title='איפה זה פוגש אותך?', index_intro='עברו על התחומים, הרגישו מה מדבר אליכן עכשיו ובחרו מאיפה להתחיל. אין כאן סדר נכון, יש את המקום שנכון לכן כרגע.',
   domain='תחום', counter='{n} מתוך 8', footer='פורצות דרך · תעשיידע', nojs='לקריאת הכתבות הקצרות ללא JavaScript'),
 'ar': dict(brand='פורצות דרך', home='الصفحة الرئيسية', all='كلّ المجالات', language='اختيار اللغة',
   main='المقال الرئيسي', closeup='نظرة عن قرب', thoughts='لحظة للتفكير...', count='8 مقالات قصيرة للقراءة الحرّة',
   read='لمتابعة القراءة ←', close='إغلاق', prev='المقال السابق', next='المقال التالي',
   source='مصادر لقراءة إضافية', photo='تصوير', license='ترخيص الاستخدام', illustration='صورة توضيحية',
   index_title='أين تلتقين بهذه العوالم؟', index_intro='تصفّحن المجالات، وفكّرن فيما يهمّكنّ الآن، واخترن من أين تبدأن. لا يوجد ترتيب صحيح، بل المكان المناسب لكنّ في هذه اللحظة.',
   domain='المجال', counter='{n} من 8', footer='פורצות דרך · תעשיידע', nojs='لقراءة المقالات القصيرة دون JavaScript')
}

def e(text):
    return escape(str(text), quote=True)

def load(path):
    return json.loads((ROOT / path).read_text())

def write(path, text):
    (ROOT / path).write_text(text + '\n')

def assets():
    path = ROOT / 'domains/images/2027/manifest.json'
    return json.loads(path.read_text())['domains'] if path.exists() else {}

def theme(i):
    return f'--hue:{HUES[i-1]}'

def header(lang, page, prefix):
    c = COPY[lang]
    he = prefix + page
    ar = prefix + 'ar/' + page
    return f'''<header class="masthead"><div class="bar">
<a class="brand" translate="no" lang="he" dir="rtl" href="{prefix}{'ar/' if lang == 'ar' else ''}strongermenu-2026.html"><img src="{prefix}icon/logo.png" alt="פורצות דרך"><span>{c['brand']}</span></a>
<div class="tools"><nav class="course-lang-switch" aria-label="{c['language']}"><a href="{he}?lang=he" lang="he" data-course-language="he"{' aria-current="true"' if lang=='he' else ''}>עברית</a><span aria-hidden="true">|</span><a href="{ar}?lang=ar" lang="ar" data-course-language="ar"{' aria-current="true"' if lang=='ar' else ''}>العربية</a></nav><a class="home" href="{'../../' if lang=='ar' else '../'}strongermenu-2026.html">{c['home']}</a></div>
</div></header>'''

def shell(lang, title, body, prefix, domain=None):
    c = COPY[lang]
    tag = f' data-domain="{domain}" style="{theme(domain)}"' if domain else ''
    return f'''<!doctype html>
<html lang="{lang}" dir="rtl">
<head>
<script src="{prefix}js/course-language.js"></script>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | {c['brand']}</title>
<link rel="icon" href="{prefix}icon/favicon.png">
<link rel="stylesheet" href="{prefix}css/domains-2027.css?v=2027-2">
<link rel="stylesheet" href="{prefix}css/course-language.css?v=2027-2">
<script defer src="{prefix}js/domains-2027.js?v=2027-1"></script>
</head><body{tag}>{body}</body></html>'''

def photo(item, lang, prefix, title, card=False):
    if not item:
        # A build without the verified manifest is for local preparation only.
        return ''
    position = e(item.get('object_position', '50% 50%'))
    alt = item.get('alt', '') if lang == 'he' else item.get('alt_ar', COPY[lang]['illustration'] + ': ' + title)
    img = f'<img src="{prefix}{e(item["path"])}" alt="{e(alt)}" loading="{"lazy" if card else "eager"}" width="960" height="540" style="object-position:{position}">'
    if card:
        return img
    credit = f'''<figcaption class="photo-credit">{COPY[lang]['photo']}: <a href="{e(item['source_url'])}" target="_blank" rel="noopener noreferrer">{e(item['credit'])}</a> · <a href="{e(item['license_url'])}" target="_blank" rel="noopener noreferrer">{COPY[lang]['license']}</a></figcaption>'''
    return '<figure>' + img + credit + '</figure>'

def paragraphs(values):
    return ''.join('<p>' + e(p) + '</p>' for p in values)

def domain_page(d, lang, manifest, teasers):
    i = d['id']
    prefix = '../../' if lang == 'ar' else '../'
    c = COPY[lang]
    photos = manifest.get(str(i), {})
    hero_photo = photos.get('hero')
    body = header(lang, f'domains/d{i}.html', prefix) + '<main>'
    body += f'''<nav class="chapter-nav" aria-label="{c['brand']}"><a href="alldomains.html">{c['all']}</a><a href="#main-article">{c['main']}</a><a href="#closeup">{c['closeup']}</a><a href="#thoughts">{c['thoughts']}</a></nav>
<section class="hero" aria-labelledby="domain-name"><div><p class="eyebrow">{c['brand']} · {c['domain']} {i:02}</p><h1 id="domain-name">{e(d['name'])}</h1><p class="intro">{e(d['intro'])}</p></div>{photo(hero_photo,lang,prefix,d['name'])}</section>
<article id="main-article" class="main-article"><h2>{e(d['main_article']['title'])}</h2>'''
    for s in d['main_article']['sections']:
        body += '<section><h3>' + e(s['heading']) + '</h3>' + paragraphs(s['paragraphs']) + '</section>'
    body += f'''</article><section id="closeup" aria-labelledby="closeup-title"><div class="sectionhead"><h2 id="closeup-title">{c['closeup']}</h2><span>{c['count']}</span></div><div class="cards">'''
    readers = ''
    for n, a in enumerate(d['short_articles']):
        ap = photos.get('articles', {}).get(a['id'])
        teaser = teasers[i-1][n] if lang == 'he' else a.get('card_teaser', a['teaser'])
        body += f'''<button type="button" class="card" data-open-article="{a['id']}" aria-haspopup="dialog" aria-controls="{a['id']}">{photo(ap,lang,prefix,a['title'],True)}<span class="card-copy"><strong class="card-title">{e(a['title'])}</strong><span class="card-teaser">{e(teaser)}</span><span class="read-more">{c['read']}</span></span></button>'''
        readers += f'''<dialog id="{a['id']}" data-article aria-labelledby="{a['id']}-title"><div class="reader-body"><div class="reader-bar"><span class="eyebrow">{c['closeup']} · {c['counter'].format(n=n+1)}</span><a class="reader-language" data-reader-language="{'he' if lang=='ar' else 'ar'}" href="{prefix}{'' if lang=='ar' else 'ar/'}domains/d{i}.html?lang={'he' if lang=='ar' else 'ar'}#{a['id']}" lang="{'he' if lang=='ar' else 'ar'}">{'עברית' if lang=='ar' else 'العربية'}</a><button type="button" class="reader-close" data-close aria-label="{c['close']}" autofocus>×</button></div>{photo(ap,lang,prefix,a['title'])}<h2 id="{a['id']}-title">{e(a['title'])}</h2>{paragraphs(a['paragraphs'])}<nav class="reader-nav" aria-label="{c['closeup']}"><button type="button" data-prev{' disabled' if n==0 else ''}>{c['prev']}</button><button type="button" data-next{' disabled' if n==7 else ''}>{c['next']}</button></nav></div></dialog>'''
    body += f'''</div><noscript><details><summary>{c['nojs']}</summary>'''
    for a in d['short_articles']:
        body += '<article><h3>' + e(a['title']) + '</h3>' + paragraphs(a['paragraphs']) + '</article>'
    body += '</details></noscript></section>'
    body += f'''<section id="thoughts" class="reflection" aria-labelledby="thoughts-title"><h2 id="thoughts-title"><svg class="thought-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 16c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7M8 17h8M9 20h6M11 23h2"/></svg>{c['thoughts']}</h2><div class="questions">{paragraphs(d['reflection_questions'])}</div></section>'''
    body += f'''<nav class="bottom-nav" aria-label="{c['brand']}"><a href="alldomains.html">{c['all']}</a><a href="#domain-name">↑ {e(d['name'])}</a></nav>'''
    # Fail closed: a translated label does not establish the linked page's language.
    # All original verification sources remain in the content JSON and audit file.
    public_sources = [s for s in d['sources'] if s.get('language') == lang
                      and s.get('language_verified') is True]
    if public_sources:
        body += f'<details class="sources"><summary>{c["source"]}</summary><ul>'
        for s in public_sources:
            body += f'<li><a href="{e(s["url"])}" hreflang="{lang}" target="_blank" rel="noopener noreferrer">{e(s.get("display_title", s["title"]))}</a></li>'
        body += '</ul></details>'
    body += f'<footer translate="no" lang="he">{c["footer"]}</footer></main>{readers}'
    dest = ('ar/' if lang == 'ar' else '') + f'domains/d{i}.html'
    write(dest, shell(lang,d['name'],body,prefix,i))

def index_page(domains, lang):
    c = COPY[lang]
    prefix = '../../' if lang == 'ar' else '../'
    body = header(lang,'domains/alldomains.html',prefix)
    body += f'<main><section class="index-intro"><h1>{c["index_title"]}</h1><p>{c["index_intro"]}</p></section><nav aria-label="{c["all"]}"><ol class="domain-list">'
    for d in domains:
        i = d['id']
        body += f'''<li><a class="domain-link" data-domain="{i}" style="{theme(i)}" href="d{i}.html"><span class="domain-num">{i:02}</span><span class="domain-copy"><strong>{e(d['name'])}</strong><small>{e(d['main_article']['title'])}</small></span><span class="domain-arrow" aria-hidden="true">←</span></a></li>'''
    body += f'</ol></nav><footer translate="no" lang="he">{c["footer"]}</footer></main>'
    write(('ar/' if lang == 'ar' else '')+'domains/alldomains.html',shell(lang,c['all'],body,prefix))

def main():
    manifest = assets()
    teasers = load('domains/content/card-teasers.he.json')
    for lang in ('he','ar'):
        domains = [load(f'domains/content/{lang}/d{i}.json') for i in range(1,11)]
        for d in domains: domain_page(d,lang,manifest,teasers)
        index_page(domains,lang)
    if not manifest:
        print('Preparation build only: verified image manifest is not ready.')
    else:
        print('Rendered 20 domain pages and two indexes; activity mechanisms untouched.')

if __name__ == '__main__': main()
