import {
  WizardStep1, WizardStep2, WizardStep3, WizardStep5,
  StepIndicator,
  PhysicalStepIndicator, PhysicalStep1, PhysicalStep2, PhysicalStep3
} from '../components/WizardSteps.js';
import {
  FIELD_DEFINITIONS,
  getAllContentKeys,
  DEFAULT_FIELD_FONT,
  DEFAULT_FIELD_COLOR,
  BACKGROUNDS
} from '../products/physical/config.js';
import { saveProject, loadProject } from './storage.js';
import { renderHTMLPoster, exportHTMLPosterToPDF } from '../canvas/html-poster.js';

const { useEffect, useRef, useState } = React;
const h = React.createElement;
const PRESELECTED_PRODUCT_TYPE = window.__POSTER_BUILDER_PRODUCT_TYPE || null;
const PRESELECTED_START_STEP = Number(window.__POSTER_BUILDER_START_STEP || 0) || null;

const ALL_CONTENT_KEYS = getAllContentKeys();
const EMPTY_PROMPT_ANSWERS = { main_whatToSee:'',main_appearance:'',main_highlight:'',main_material:'',main_background:'',main_style:'',main_realism:'',main_colors:'',main_exclude:'',usage_who:'',usage_howMany:'',usage_action:'',usage_where:'',usage_understand:'',usage_highlight:'',usage_style:'',usage_realism:'',usage_colors:'',usage_exclude:'' };
const EMPTY_CONTENT = Object.fromEntries(ALL_CONTENT_KEYS.map((k) => [k, '']));
const DEFAULT_SETTINGS = Object.fromEntries(FIELD_DEFINITIONS.map((f) => [f.id, { fontFamily: DEFAULT_FIELD_FONT, color: DEFAULT_FIELD_COLOR, borderRadius: 20 }]));
const EMPTY_SLOT_IMAGES = { visual: null, visual_1: null, visual_2: null, visual_3: null };

function App() {
  const [wizardStep, setWizardStep] = useState(PRESELECTED_START_STEP || (PRESELECTED_PRODUCT_TYPE === 'physical' ? 2 : 1));
  const [posterSize] = useState('A4');
  const [productType, setProductType] = useState(PRESELECTED_PRODUCT_TYPE || 'physical');
  const [currentBackground, setCurrentBackground] = useState(BACKGROUNDS[0].path);
  const [contentValues, setContentValues] = useState(EMPTY_CONTENT);
  const [fieldSettings, setFieldSettings] = useState(DEFAULT_SETTINGS);
  const [slotImages, setSlotImages] = useState(EMPTY_SLOT_IMAGES);
  const [titleFont, setTitleFont] = useState('IBM Plex Sans Hebrew');
  const [titleColor, setTitleColor] = useState('#5E2750');
  const [textColor, setTextColor] = useState('#1f1030');
  const [currentShape, setCurrentShape] = useState(20);
  const [physicalSubStep, setPhysicalSubStep] = useState(1);
  const [promptAnswers, setPromptAnswers] = useState(EMPTY_PROMPT_ANSWERS);

  const productTypeRef = useRef(productType);
  const currentBackgroundRef = useRef(currentBackground);
  const contentValuesRef = useRef(contentValues);
  const fieldSettingsRef = useRef(fieldSettings);
  const slotImagesRef = useRef(slotImages);
  const textColorRef = useRef(textColor);
  useEffect(()=>{productTypeRef.current=productType;},[productType]);
  useEffect(()=>{currentBackgroundRef.current=currentBackground;},[currentBackground]);
  useEffect(()=>{contentValuesRef.current=contentValues;},[contentValues]);
  useEffect(()=>{fieldSettingsRef.current=fieldSettings;},[fieldSettings]);
  useEffect(()=>{slotImagesRef.current=slotImages;},[slotImages]);
  useEffect(()=>{textColorRef.current=textColor;},[textColor]);

  useEffect(()=>{
    const saved = loadProject();
    if (!saved) return;
    setProductType(PRESELECTED_PRODUCT_TYPE || saved.productType || 'physical');
    setCurrentBackground(saved.background || BACKGROUNDS[0].path);
    setContentValues({ ...EMPTY_CONTENT, ...(saved.contentValues || {}) });
    setFieldSettings({ ...DEFAULT_SETTINGS, ...(saved.fieldSettings || {}) });
    setSlotImages({ ...EMPTY_SLOT_IMAGES, ...(saved.slotImages || {}) });
    if (saved.titleStyle?.fontFamily) setTitleFont(saved.titleStyle.fontFamily);
    if (saved.titleStyle?.color) setTitleColor(saved.titleStyle.color);
    if (saved.titleStyle?.textColor) setTextColor(saved.titleStyle.textColor);
  },[]);

  useEffect(() => {
    saveProject({ posterSize, productType, background: currentBackground, contentValues, fieldSettings, titleStyle: { fontFamily: titleFont, color: titleColor, textColor }, slotImages });
    if (wizardStep === 4) renderHTMLPoster(contentValues, productType, titleFont, titleColor, textColor, currentBackground, slotImages);
  }, [posterSize, productType, currentBackground, contentValues, fieldSettings, titleFont, titleColor, textColor, slotImages, wizardStep]);

  const handleProductTypeChange = (type) => { if (!PRESELECTED_PRODUCT_TYPE) setProductType(type); };
  const handleBackground = (path) => { currentBackgroundRef.current = path; setCurrentBackground(path); saveProject({ ...loadProject(), background: path }); if (wizardStep===4) renderHTMLPoster(contentValuesRef.current, productTypeRef.current, titleFont, titleColor, textColorRef.current, path, slotImagesRef.current); };
  const handleShape = (borderRadius) => { setCurrentShape(borderRadius); setFieldSettings(Object.fromEntries(FIELD_DEFINITIONS.map((f)=>[f.id,{...(fieldSettingsRef.current[f.id]||{}),borderRadius}]))); };
  const handleTitleFont = (font) => setTitleFont(font);
  const handleTitleColor = (color) => setTitleColor(color);
  const onContentFieldChange = (key, rawValue) => setContentValues({ ...contentValuesRef.current, [key]: rawValue });
  const onSlotUpload = (slotKey, file) => { if (!file) return; const r = new FileReader(); r.onload = (e)=>{ const dataUrl=e.target.result; const nextSlots={...slotImagesRef.current,[slotKey]:dataUrl}; slotImagesRef.current=nextSlots; setSlotImages(nextSlots); saveProject({ ...loadProject(), slotImages: nextSlots }); if (wizardStep===4) renderHTMLPoster(contentValuesRef.current, productTypeRef.current, titleFont, titleColor, textColorRef.current, currentBackgroundRef.current, nextSlots); }; r.readAsDataURL(file); };
  const onSlotClear = (slotKey) => { const nextSlots={...slotImagesRef.current,[slotKey]:null}; slotImagesRef.current=nextSlots; setSlotImages(nextSlots); saveProject({ ...loadProject(), slotImages: nextSlots }); if (wizardStep===4) renderHTMLPoster(contentValuesRef.current, productTypeRef.current, titleFont, titleColor, textColorRef.current, currentBackgroundRef.current, nextSlots); };
  const handleExportPdf = () => exportHTMLPosterToPDF();

  const goToStep = (step) => {
    const nextStep = PRESELECTED_PRODUCT_TYPE === 'physical' && step === 1 ? 2 : step;
    setWizardStep(nextStep);
    if (nextStep === 4) setTimeout(() => renderHTMLPoster(contentValuesRef.current, productTypeRef.current, titleFont, titleColor, textColorRef.current, currentBackgroundRef.current, slotImagesRef.current), 60);
  };
  const isStep4 = wizardStep === 4;

  return h('div',{className:'app'}, h('div',{className:'step4-wrapper',style:{display:isStep4?'flex':'none'}}, h('div',{className:'step4-bar'}, h('div',{className:'step4-bar-start'}, h('button',{className:'step4-back-btn',onClick:()=>{if(PRESELECTED_START_STEP===4){const p={physical:'./physical.html',website:'./website.html',app:'./app.html'};window.location.href=p[productType]||'./physical.html';return;} if(productType==='physical'){setPhysicalSubStep(2);} goToStep(3);}},'‹ חזרה')), h('div',{className:'step4-bar-center'},productType==='physical'?h(PhysicalStepIndicator,{current:4}):h(StepIndicator,{current:4})), h('div',{className:'step4-bar-end'}, h('button',{className:'step4-export-btn',onClick:handleExportPdf},'ייצוא PDF'), h('button',{className:'step4-finish-btn',onClick:()=>goToStep(5)},'סיום ›'))),
    h('div',{className:'step4-body'}, h('div',{className:'html-poster-area'}, h('div',{id:'poster-html',style:{width:'794px',height:'1123px',minHeight:'1123px',position:'relative',overflow:'visible',direction:'rtl',background:'#fff',display:'flex',flexDirection:'column',boxShadow:'0 16px 56px rgba(94,39,80,.2), 0 4px 16px rgba(0,0,0,.08)',flexShrink:0}}, h('div',{id:'poster-bg',style:{position:'absolute',inset:0,zIndex:0}}), h('div',{id:'poster-inner',style:{position:'relative',zIndex:1,display:'flex',flexDirection:'column',height:'1123px',minHeight:'1123px'}}, h('div',{style:{height:'5px',background:'linear-gradient(90deg,#5E2750,#d61f8c,#9b40c0,#5E2750)',flexShrink:0}}), h('div',{style:{padding:'16px 32px 10px',textAlign:'center',position:'relative',flexShrink:0}}, h('div',{style:{position:'absolute',top:'10px',right:'20px'}},h('img',{src:'/poster-builder/assets/logoposter.svg',alt:'פורצות דרך',style:{height:'78px',width:'auto',objectFit:'contain',filter:'drop-shadow(0 0 4px rgba(255,255,255,0.95)) drop-shadow(0 0 10px rgba(255,255,255,0.75))'}})), h('div',{id:'ph-name',style:{fontWeight:900,lineHeight:1.1,marginBottom:'8px',wordBreak:'break-word',overflowWrap:'anywhere'}}), h('div',{id:'ph-title-line',style:{width:'120px',maxWidth:'620px',height:'3px',background:'linear-gradient(90deg,#5E2750,#d61f8c)',borderRadius:'2px',margin:'0 auto 10px'}}), h('div',{id:'ph-desc',style:{fontSize:'15px',fontWeight:700,maxWidth:'500px',margin:'0 auto',lineHeight:1.45}}), h('div',{id:'ph-team',style:{background:'rgba(255,255,255,.96)',border:'1px solid rgba(94,39,80,.2)',borderRadius:'10px',padding:'6px 12px',width:'fit-content',maxWidth:'390px',margin:'7px auto 0'}},h('div',{id:'ph-names',style:{fontSize:'10px',fontWeight:400,lineHeight:1.65}}),h('div',{id:'ph-school',style:{fontSize:'9px',fontWeight:400,lineHeight:1.45,marginTop:'2px'}}))), h('div',{id:'ph-main',style:{flex:'1 1 auto',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:'10px',padding:'0 24px 8px'}}, h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'9px',flexShrink:0}}, h('div',{className:'ph-card'},h('div',{className:'ph-cap'},'הבעיה שזיהינו'),h('div',{id:'ph-problem',className:'ph-body'}),h('div',{id:'ph-audience',className:'ph-sub'})),h('div',{className:'ph-card'},h('div',{className:'ph-cap'},'שאלת החקר'),h('div',{id:'ph-rq',className:'ph-body'}))), h('div',{style:{flexShrink:0}},h('div',{id:'ph-images-label',style:{fontSize:'7.5px',fontWeight:700,color:'#5E2750',textTransform:'uppercase',letterSpacing:'1.5px',textAlign:'center',marginBottom:'7px'}}),h('div',{id:'ph-images-2',style:{display:'none',gridTemplateColumns:'1fr 1fr',gap:'10px'}},h('div',{id:'ph-img-physical-0','data-ph-img':'0','data-layout':'physical',className:'ph-img-frame',style:{height:'205px'}}),h('div',{id:'ph-img-physical-1','data-ph-img':'1','data-layout':'physical',className:'ph-img-frame',style:{height:'205px'}})),h('div',{id:'ph-images-app',style:{display:'none',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}},h('div',{id:'ph-img-app-0','data-ph-img':'0','data-layout':'app',className:'ph-img-frame ph-notch',style:{height:'250px'}}),h('div',{id:'ph-img-app-1','data-ph-img':'1','data-layout':'app',className:'ph-img-frame ph-notch',style:{height:'250px'}}),h('div',{id:'ph-img-app-2','data-ph-img':'2','data-layout':'app',className:'ph-img-frame ph-notch',style:{height:'250px'}})),h('div',{id:'ph-images-web',style:{display:'none',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}},h('div',{id:'ph-img-web-0','data-ph-img':'0','data-layout':'website',className:'ph-img-frame',style:{height:'170px'}}),h('div',{id:'ph-img-web-1','data-ph-img':'1','data-layout':'website',className:'ph-img-frame',style:{height:'170px'}}),h('div',{id:'ph-img-web-2','data-ph-img':'2','data-layout':'website',className:'ph-img-frame',style:{height:'170px'}}))), h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',flexShrink:0}},h('div',{className:'ph-card'},h('div',{className:'ph-cap'},'החקר שביצענו'),h('ul',{id:'ph-research',className:'ph-bullets'})),h('div',{className:'ph-card'},h('div',{className:'ph-cap'},'תובנות מהחקר'),h('div',{id:'ph-findings',className:'ph-body'})),h('div',{className:'ph-card'},h('div',{className:'ph-cap'},'דרישות הפתרון'),h('ul',{id:'ph-reqs',className:'ph-bullets'}))), h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'9px',flexShrink:0}},h('div',{className:'ph-card'},h('div',{id:'ph-solution-cap',className:'ph-cap'}),h('div',{id:'ph-solution',className:'ph-body'})),h('div',{className:'ph-card'},h('div',{id:'ph-usage-cap',className:'ph-cap'}),h('ul',{id:'ph-usage',className:'ph-bullets'}))), h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',flexShrink:0}},h('div',{className:'ph-card ph-card-accent'},h('div',{className:'ph-cap'},'המשוב שקיבלנו'),h('div',{id:'ph-feedback',className:'ph-body'})),h('div',{className:'ph-card ph-card-accent'},h('div',{className:'ph-cap'},'מה שיפרנו'),h('div',{id:'ph-improved',className:'ph-body'})),h('div',{className:'ph-card ph-card-accent'},h('div',{className:'ph-cap'},'הערך המרכזי'),h('div',{id:'ph-value',className:'ph-body'})))), h('div',{id:'ph-footer',style:{background:'linear-gradient(135deg,#4a1f40,#5E2750,#9b40c0)',padding:'8px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}},h('div',{id:'ph-slogan',style:{fontStyle:'italic',fontSize:'13px',color:'rgba(255,255,255,.95)'}}),h('div',{style:{fontSize:'9.5px',color:'rgba(255,255,255,.6)',fontWeight:700,letterSpacing:'1.2px'}},'פורצות דרך ✦ 2026')))))))))),
  (wizardStep<4||wizardStep===5)&&h('div',{className:'wz-overlay'}, !PRESELECTED_PRODUCT_TYPE&&wizardStep===1&&h(WizardStep1,{productType,onProductTypeChange:handleProductTypeChange,onNext:()=>goToStep(2)}), wizardStep===2&&productType==='physical'&&h(PhysicalStep1,{contentValues,onContentChange:onContentFieldChange,onBack:()=>{if(PRESELECTED_PRODUCT_TYPE==='physical'){window.location.href='../index.html';return;}goToStep(1);},onNext:()=>{setPhysicalSubStep(1);goToStep(3);}}), wizardStep===3&&productType==='physical'&&physicalSubStep===1&&h(PhysicalStep2,{promptAnswers,onPromptChange:(k,v)=>setPromptAnswers((p)=>({...p,[k]:v})),contentValues,onBack:()=>goToStep(2),onNext:()=>setPhysicalSubStep(2)}), wizardStep===3&&productType==='physical'&&physicalSubStep===2&&h(PhysicalStep3,{contentValues,promptAnswers,posterSize,slotImages,onSlotUpload,onSlotClear,onBack:()=>setPhysicalSubStep(1),onNext:()=>goToStep(4)}), wizardStep===2&&productType!=='physical'&&h(WizardStep2,{currentBackground,currentShape,titleFont,titleColor,textColor,onBackground:handleBackground,onShape:handleShape,onTitleFont:handleTitleFont,onTitleColor:handleTitleColor,onTextColor:setTextColor,onNext:()=>goToStep(3),onBack:()=>goToStep(1)}), wizardStep===3&&productType!=='physical'&&h(WizardStep3,{productType,contentValues,slotImages,posterSize,onContentChange:onContentFieldChange,onSlotUpload,onSlotClear,onNext:()=>goToStep(4),onBack:()=>goToStep(2)}), wizardStep===5&&h(WizardStep5,{onExportPdf:handleExportPdf,onBack:()=>goToStep(4)})));
}
ReactDOM.createRoot(document.getElementById('root')).render(h(App));
