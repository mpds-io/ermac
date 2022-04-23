const obj = {
    a: 'a',
    b: 'b',
    c: { d: 'd', e: 'e' }
};
const obj2 = {
    a: 'a2',
    b: 'b2',
    c: { e: ['e', 'e2'] },
    f: 'f'
};
const obj3 = {
    a: 'a3',
    b: 'b3',
    c: { e: ['e3'] },
    d: 'd',
    f: 'f',
    g: ['g', 'g2', 'g3']
};
const array = ['a', 'b'];

window.onload = () => {
    console.log(
        'DOM',
        $('.controlswitch').children()
        // wmgui.$(),
        // 'window:', wmgui.$(window).nodes,
        // 'attr:', wmgui.$('#search_box').style(),
        // 'append:', wmgui.$(`#ermac_logo`).append('<span>Append</span>'),
        // 'prepend:', wmgui.$(`#ermac_logo`).prepend('<span>Prepend</span>'),
        // 'find:', wmgui.$(`#ermac_logo`).find('a').nodes,
        // 'find.style:', wmgui.$(`#ermac_logo`).find('a').style({ border: '1px solid red' }),
        // 'find.append:', wmgui.$(`#ermac_logo`).find('a').append('<span>Append</span>'),
        // 'nodes:', wmgui.$('#notifybox, #preloader').nodes.forEach(n => console.log(n)),
        // 'show:', wmgui.$('#notifybox, #preloader').show(false),
        // 'is[style="display: block"]:', wmgui.$('#preloader').is('[style="display: block"]'),
        // 'is:empty:', wmgui.$('#overlay').is(':empty'),
        // 'is:checked:', wmgui.$('#aet_limit').is(':checked'),
        // 'style:', wmgui.$('#aetmap > div').style(),
        // 'html:', wmgui.$('#aetmap').html(),
        // 'addClass:', wmgui.$('#ermac_logo').addClass('wmgui', 'second').removeClass('wmgui'),
        // 'each(nodes).attr:', wmgui.$('a.pltcol_links').each((node) => console.log(node, wmgui.$(node).attr('rev'))),
        // 'UTILS',
        // 'isEmpty:', !wmgui.$.isEmpty({}) && console.log(true),
        // 'each(arrray)', wmgui.$.each(array, (a) => console.log(a)),
        // 'each(obj)', wmgui.$.each(obj, ([k, v]) => console.log(k, v)),
        // 'extend', wmgui.$.extend(true, obj, obj2, obj3), obj, obj2, obj3,
        // 'EVENTS',
        // 'on', wmgui.$('#ermac_logo').on('click', function (e) {
        //     console.log(e, this);
        //     wmgui.$('#search_field-selectized').trigger('click');
        // })
    );
};