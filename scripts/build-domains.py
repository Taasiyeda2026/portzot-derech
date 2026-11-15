#!/usr/bin/env python3
"""Render both languages from the same domain template. No runtime content API."""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HUES = [335, 205, 38, 270, 165, 18, 230, 125, 355, 185]
# Original line icons, shared by the index and domain mastheads.
ICONS = [
 '<path d="M16 28c-8-5-10-9-10-14a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 5-2 9-10 14Z"/><path d="m8 17 5 0 2-5 3 10 2-5h5"/>',
 '<rect x="9" y="3" width="15" height="26" rx="4"/><path d="M14 7h5M15 25h3M4 10l-2 5 3 4M28 8l2 5-3 4"/>',
 '<path d="m2 12 14-8 14 8-14 8-14-8ZM7 16v8c6 5 12 5 18 0v-8M29 13v10"/>',
 '<circle cx="11" cy="10" r="5"/><circle cx="24" cy="12" r="4"/><path d="M2 28v-4c0-8 18-8 18 0v4M22 20c6-1 8 3 8 7"/>',
 '<rect x="3" y="8" width="26" height="19" rx="4"/><path d="m7 8 16-5v5M21 16h8v7h-8a3.5 3.5 0 0 1 0-7Z"/><circle cx="23" cy="19.5" r=".7"/>',
 '<path d="m3 24 7-2 4-9 6 4 4-3M13 14l-5-1-4 5M16 20l-2 9M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>',
 '<path d="m3 15 13-11 13 11M6 13v15h20V13M12 28v-9h8v9M23 4v6"/>',
 '<path d="M8 24C-1 7 17 2 28 4c1 16-9 28-20 20ZM5 29 23 10M10 23l1-9M16 17h9"/>',
 '<path d="M17 3C8 3 2 9 2 17s6 12 11 12c7 0 1-7 7-7h4c9 0 8-19-7-19Z"/><circle cx="10" cy="12" r="1.5"/><circle cx="18" cy="8" r="1.5"/><circle cx="24" cy="14" r="1.5"/>',
 '<path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10ZM26 2v5M24 4h5"/>'
]

INDEX_ICONS = ["🧘‍♀️","📱","👩‍🏫","👩‍❤️‍👩","💸","🏃‍♀️","🏠","🌿","🎨","🔮"]

def icon(i):
    return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[i-1] + '</svg>'

COPY = {
 'he': dict(brand='פורצות דרך', home='עמוד הבית', all='לכל התחומים', language='בחירת שפה',
   main='כתבה מרכזית', closeup='מבט מקרוב', thoughts='רגע למחשבה...', count='8 כתבות קצרות לקריאה חופשית',
   read='להמשך קריאה ←', close='סגירה', prev='לכתבה הקודמת', next='לכתבה הבאה',
   source='מקורות לקריאה נוספת', photo='צילום', license='רישיון שימוש', illustration='המחשה',
   index_title='איפה זה פוגש אותך?', index_intro='עברו על התחומים, הרגישו מה מדבר אליכן עכשיו ובחרו מאיפה להתחיל. אין כאן סדר נכון, יש את המקום שנכון לכן כרגע.',
   domain='תחום', counter='{n} מתוך 8', footer='פורצות דרך · תעשיידע', nojs='לקריאת הכתבות הקצרות ללא JavaScript'),
 'ar': dict(brand='פורצות דרך', home='الصفحة الرئيسية', all='كلّ المجالات', language='اختيار اللغة',
   main='المقال الرئيسي', closeup='نظرة عن قرب', thoughts='لحظة للتفكير...', count='8 مقالات قصيرة للقراءة الحرّة',
   read='لمتابعة القراءة ←', close='إغلاق', prev='المقال السابق', next='المقال التالي',
   source='مصادر لقراءة إضافية', photo='تصوير', license='ترخيص الاستخدام', illustration='توضيح',
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
    stylesheet = "domains-2027.css?v=2027-8" if domain else "domains-index-2027.css?v=1"
    reader_script = "2027-3" if domain else "2027-2"
    return f'''<!doctype html>
<html lang="{lang}" dir="rtl">
<head>
<script src="{prefix}js/course-language.js"></script>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | {c['brand']}</title>
<link rel="icon" href="{prefix}icon/favicon.png">
<link rel="stylesheet" href="{prefix}css/{stylesheet}">
<link rel="stylesheet" href="{prefix}css/course-language.css?v=2027-2">
<script defer src="{prefix}js/domains-2027.js?v={reader_script}"></script>
</head><body{tag}>{body}</body></html>'''

def photo(item, lang, prefix, title, card=False):
    if not item:
        # A build without the verified manifest is for local preparation only.
        return ''
    position = e(item.get('object_position', '50% 50%'))
    alt = item.get('alt', '') if lang == 'he' else item.get('alt_ar', COPY[lang]['illustration'] + ': ' + title)
    # Match intrinsic ratios of the final 2027 assets (heroes 16:9, articles 3:2).
    size = item.get('width_height') or (
        (1600, 900) if item.get('role') == 'hero' else (1200, 800)
    )
    img = f'<img src="{prefix}{e(item["path"])}" alt="{e(alt)}" loading="{"lazy" if card else "eager"}" width="{size[0]}" height="{size[1]}" style="object-position:{position}">'
    if card:
        return img
    # Keep credits in metadata; distinguish selected AI illustrations from documentation.
    caption = ''
    if item.get('show_ai_disclosure'):
        label = 'המחשה שנוצרה בבינה מלאכותית' if lang == 'he' else 'صورة توضيحية أُنشئت بالذكاء الاصطناعي'
        caption = '<figcaption class="ai-disclosure">' + e(label) + '</figcaption>'
    return '<figure>' + img + caption + '</figure>'

def paragraphs(values):
    return ''.join('<p>' + e(p) + '</p>' for p in values)

def article_content(a, heading_tag='h3', inline_photo=''):
    if not a.get('sections'):
        return paragraphs(a['paragraphs'])
    result = '<p><strong>' + e(a['teaser']) + '</strong></p>'
    for n, s in enumerate(a['sections']):
        content = paragraphs(s['paragraphs'])
        if n == 0 and inline_photo and s['paragraphs']:
            content = paragraphs(s['paragraphs'][:1]) + inline_photo + paragraphs(s['paragraphs'][1:])
        result += f'<section><{heading_tag}>' + e(s['heading']) + f'</{heading_tag}>' + content + '</section>'
    return result

def domain_page(d, lang, manifest, teasers):
    i = d['id']
    prefix = '../../' if lang == 'ar' else '../'
    c = COPY[lang]
    photos = manifest.get(str(i), {})
    hero_photo = photos.get('hero')
    body = header(lang, f'domains/d{i}.html', prefix) + '<main>'
    body += f'''<nav class="chapter-nav" aria-label="{c['brand']}"><a href="alldomains.html">{c['all']}</a><a href="#main-article">{c['main']}</a><a href="#closeup">{c['closeup']}</a><a href="#thoughts">{c['thoughts']}</a></nav>
<section class="hero" aria-labelledby="domain-name"><div><span class="hero-icon" aria-hidden="true">{icon(i)}</span><p class="eyebrow">{c['brand']} · {c['domain']} {i:02}</p><h1 id="domain-name">{e(d['name'])}</h1><p class="intro">{e(d['intro'])}</p></div>{photo(hero_photo,lang,prefix,d['name'])}</section>
<article id="main-article" class="main-article"><h2>{e(d['main_article']['title'])}</h2>'''
    if d['main_article'].get('subtitle'):
        body += '<p><strong>' + e(d['main_article']['subtitle']) + '</strong></p>'
    for s in d['main_article']['sections']:
        body += '<section><h3>' + e(s['heading']) + '</h3>' + paragraphs(s['paragraphs']) + '</section>'
    body += f'''</article><section id="closeup" aria-labelledby="closeup-title"><div class="sectionhead"><h2 id="closeup-title">{c['closeup']}</h2><span>{c['count']}</span></div><div class="cards">'''
    readers = ''
    for n, a in enumerate(d['short_articles']):
        ap = photos.get('articles', {}).get(a['id'])
        teaser = teasers[i-1][n] if lang == 'he' else a.get('card_teaser', a['teaser'])
        body += f'''<button type="button" class="card" data-open-article="{a['id']}" aria-haspopup="dialog" aria-controls="{a['id']}">{photo(ap,lang,prefix,a['title'],True)}<span class="card-copy"><strong class="card-title">{e(a['title'])}</strong><span class="card-teaser">{e(teaser)}</span><span class="read-more">{c['read']}</span></span></button>'''
        readers += f'''<dialog id="{a['id']}" data-article aria-labelledby="{a['id']}-title"><div class="reader-body"><div class="reader-bar"><div class="reader-meta"><span class="reader-current">{e(a['title'])}</span><span class="reader-count">{'כתבה' if lang == 'he' else 'المقال'} {c['counter'].format(n=n+1)}</span></div><button type="button" class="reader-close" data-close aria-label="{c['close']}" autofocus>×</button></div><h2 id="{a['id']}-title">{e(a['title'])}</h2>{article_content(a, inline_photo=photo(ap,lang,prefix,a['title']))}<nav class="reader-nav" aria-label="{c['closeup']}"><button type="button" data-prev{' disabled' if n==0 else ''}>{c['prev']}</button><button type="button" data-next{' disabled' if n==7 else ''}>{c['next']}</button></nav></div></dialog>'''
    body += f'''</div><noscript><details><summary>{c['nojs']}</summary>'''
    for a in d['short_articles']:
        body += '<article><h3>' + e(a['title']) + '</h3>' + article_content(a, 'h4') + '</article>'
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

def index_page(domains, lang, manifest):
    c = COPY[lang]
    prefix = '../../' if lang == 'ar' else '../'
    body = header(lang,'domains/alldomains.html',prefix)
    body += f'<main><section class="index-intro"><h1>{c["index_title"]}</h1><p>{c["index_intro"]}</p></section><nav aria-label="{c["all"]}"><ol class="domain-list">'
    for d in domains:
        i = d['id']
        body += f'''<li><a class="domain-link" data-domain="{i}" style="{theme(i)}" href="d{i}.html"><span class="domain-num">{i:02}</span><span class="domain-icon" aria-hidden="true">{INDEX_ICONS[i-1]}</span><span class="domain-copy"><strong>{e(d['name'])}</strong><small>{e(d['main_article']['title'])}</small></span><span class="domain-arrow" aria-hidden="true">←</span></a></li>'''
    body += f'</ol></nav><footer translate="no" lang="he">{c["footer"]}</footer></main>'
    write(('ar/' if lang == 'ar' else '')+'domains/alldomains.html',shell(lang,c['all'],body,prefix))

def validate_expanded_domain(d, lang):
    """Reject partial editorial updates before replacing any public page."""
    def words(values):
        return len(' '.join(values).split())
    main_words = words([p for s in d['main_article']['sections'] for p in s['paragraphs']])
    if not 600 <= main_words <= 800:
        raise ValueError(f"{lang} d{d['id']}: main article has {main_words} words")
    if len(d['short_articles']) != 8 or len(d['reflection_questions']) != 4:
        raise ValueError(f"{lang} d{d['id']}: incomplete articles or questions")
    for article in d['short_articles']:
        sections = article.get('sections', [])
        if not 3 <= len(sections) <= 4:
            raise ValueError(f"{lang} {article['id']}: expected 3–4 sections")
        if [p for section in sections for p in section['paragraphs']] != article['paragraphs']:
            raise ValueError(f"{lang} {article['id']}: section and body mismatch")
        count = words(article['paragraphs'])
        if not 300 <= count <= 450:
            raise ValueError(f"{lang} {article['id']}: article has {count} words")

def main():
    manifest = assets()
    teasers = load('domains/content/card-teasers.he.json')
    languages = {lang: [load(f'domains/content/{lang}/d{i}.json') for i in range(1,11)]
                 for lang in ('he', 'ar')}
    # Validate the complete bilingual set before writing any generated output.
    for lang, domains in languages.items():
        for d in domains:
            validate_expanded_domain(d, lang)
    for lang, domains in languages.items():
        for d in domains: domain_page(d,lang,manifest,teasers)
        index_page(domains,lang,manifest)
    if not manifest:
        print('Preparation build only: verified image manifest is not ready.')
    else:
        print('Rendered 20 domain pages and two indexes; activity mechanisms untouched.')

if __name__ == '__main__': main()
