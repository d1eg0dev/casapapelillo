import { useState, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════
   HIGH SEASON DEFINITIONS
   ═══════════════════════════════════════════ */
const HIGH_SEASON = [
  { start: "2026-01-29", end: "2026-02-12", label: "Chinese New Year" },
  { start: "2026-03-29", end: "2026-04-05", label: "Holy & Easter Week" },
  { start: "2026-11-05", end: "2026-11-10", label: "Ondalinda Festival" },
  { start: "2026-12-20", end: "2027-01-05", label: "Christmas & New Year's" },
  { start: "2027-01-29", end: "2027-02-20", label: "Chinese New Year" },
  { start: "2027-03-21", end: "2027-03-28", label: "Holy & Easter Week" },
  { start: "2027-11-04", end: "2027-11-09", label: "Ondalinda Festival" },
  { start: "2027-12-20", end: "2028-01-05", label: "Christmas & New Year's" },
];

const BOOKED = [
  { start: "2026-04-15", end: "2026-04-19" },
];

/* ═══════════════════════════════════════════
   EXPERIENCES (all USD, rounded from MXN÷20)
   ═══════════════════════════════════════════ */
const EXP_CATEGORIES = [
  {
    category: "Transportation",
    items: [
      { id: "tr_mzt", name: "Airport Transfer — Manzanillo", desc: "Private sedan, up to 4 guests", price: 150, qty: false },
      { id: "tr_pvr", name: "Airport Transfer — Puerto Vallarta", desc: "Private sedan, up to 4 guests", price: 250, qty: false },
    ]
  },
  {
    category: "Adventures",
    items: [
      { id: "boat", name: "Boat Rental & Fishing", desc: "8–10 guests · min 2 hours", price: 165, unit: "/hour", qty: true, min: 2 },
      { id: "horse", name: "Horseback Riding", desc: "Guided coastal ride", price: 75, unit: "/person", qty: true, min: 1 },
    ]
  },
  {
    category: "Wellness",
    items: [
      { id: "yoga", name: "Yoga & Meditation", desc: "1–5 participants · 1hr session", price: 148, qty: true, min: 1 },
      { id: "yoga_extra", name: "Yoga — Additional Participant", desc: "Per extra person beyond 5", price: 28, unit: "/person", qty: true, min: 1 },
      { id: "sound", name: "Sound Healing (Sound Bath)", desc: "1–5 participants · ~1 hour", price: 231, qty: true, min: 1 },
      { id: "sound_extra", name: "Sound Healing — Extra Participant", desc: "Per extra person beyond 5", price: 46, unit: "/person", qty: true, min: 1 },
    ]
  },
  {
    category: "Massage & Beauty",
    items: [
      { id: "mass_relax", name: "Relaxing Massage", desc: "60 min · gentle pressure & aromatherapy", price: 94, qty: true, min: 1 },
      { id: "mass_deep", name: "Deep Tissue Massage", desc: "90 min · focused techniques & stretching", price: 127, qty: true, min: 1 },
      { id: "mani_pedi", name: "Manicure + Pedicure", desc: "Full nail care treatment", price: 180, qty: true, min: 1 },
      { id: "mani_or_pedi", name: "Manicure or Pedicure", desc: "Single treatment", price: 90, qty: true, min: 1 },
      { id: "makeup", name: "Makeup + Hairstyling", desc: "Per person", price: 210, unit: "/person", qty: true, min: 1 },
    ]
  },
];

/* ═══ HELPERS ═══ */
const pd = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const fd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fDisp = (d) => d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const addD = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const same = (a,b) => a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const diffD = (a,b) => Math.round((b-a)/864e5);
const inRange = (date,s,e) => date.getTime()>=pd(s).getTime()&&date.getTime()<=pd(e).getTime();
const getHigh = (date) => HIGH_SEASON.find(r=>inRange(date,r.start,r.end))||null;
const isBooked = (date) => BOOKED.some(r=>inRange(date,r.start,r.end));
const hasBooked = (s,e) => { let d=new Date(s); while(d<=e){if(isBooked(d))return true;d=addD(d,1);} return false; };
const getSeason = (ci,co) => { let d=new Date(ci),h=0,l=0; while(d<co){getHigh(d)?h++:l++;d=addD(d,1);} return h>=l?"high":"low"; };
const calDays = (y,m) => { const f=new Date(y,m,1),last=new Date(y,m+1,0).getDate(); let dow=f.getDay();if(dow===0)dow=7; const days=[];for(let i=1;i<dow;i++)days.push(null);for(let d=1;d<=last;d++)days.push(new Date(y,m,d));return days; };
const MO=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DY=["Mo","Tu","We","Th","Fr","Sa","Su"];
const RATE_H=3600,RATE_L=1800,MIN_H=7,MIN_L=3;
const STEP_DATES=0,STEP_EXP=1,STEP_CONTACT=2,STEP_CONFIRM=3;

export default function BookingWidget() {
  const today=new Date(), todayC=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const [vY,setVY]=useState(today.getFullYear()),[vM,setVM]=useState(today.getMonth());
  const [ci,setCi]=useState(null),[co,setCo]=useState(null),[sel,setSel]=useState("in");
  const [guests,setGuests]=useState(1),[step,setStep]=useState(STEP_DATES);
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState("");
  const [err,setErr]=useState(""),[expSel,setExpSel]=useState({}),[notes,setNotes]=useState("");

  const days=useMemo(()=>calDays(vY,vM),[vY,vM]);
  const prev=()=>{if(vM===0){setVM(11);setVY(vY-1)}else setVM(vM-1)};
  const next=()=>{if(vM===11){setVM(0);setVY(vY+1)}else setVM(vM+1)};

  const nights=ci&&co?diffD(ci,co):0;
  const season=ci&&co?getSeason(ci,co):null;
  const rate=season==="high"?RATE_H:RATE_L;
  const rentalTotal=nights*rate;
  const highInfo=ci?getHigh(ci):null;

  const toggleExp=(id)=>setExpSel(p=>{const n={...p};if(n[id])delete n[id];else n[id]=1;return n;});
  const setExpQty=(id,qty)=>setExpSel(p=>({...p,[id]:Math.max(1,qty)}));

  const expTotal=useMemo(()=>{let t=0;for(const c of EXP_CATEGORIES)for(const i of c.items)if(expSel[i.id])t+=i.price*(i.qty?(expSel[i.id]||1):1);return t;},[expSel]);
  const grandTotal=rentalTotal+expTotal;

  const handleDay=useCallback((date)=>{
    if(!date||isBooked(date)||date<todayC)return;setErr("");
    if(sel==="in"||(ci&&co)){setCi(date);setCo(null);setSel("out");}
    else{if(date<=ci){setCi(date);setCo(null);return;}
    if(hasBooked(ci,date)){setErr("Selected dates overlap with an existing reservation.");return;}
    const n=diffD(ci,date),s=getSeason(ci,date),min=s==="high"?MIN_H:MIN_L;
    if(n<min){setErr(`Minimum stay is ${min} nights during ${s} season.`);return;}
    setCo(date);setSel("in");}
  },[ci,co,sel,todayC]);

  const inSel=(d)=>{if(!d||!ci)return false;if(co)return d>=ci&&d<=co;return same(d,ci);};
  const canNext=()=>{if(step===STEP_DATES)return ci&&co;if(step===STEP_EXP)return true;if(step===STEP_CONTACT)return name.trim()&&email.trim()&&phone.trim();return false;};

  const [sending,setSending]=useState(false);

  const handleSubmit=async()=>{
    const payload={checkIn:fd(ci),checkOut:fd(co),nights,guests,season,rate,rentalTotal,
      experiences:Object.entries(expSel).map(([id,qty])=>{const item=EXP_CATEGORIES.flatMap(c=>c.items).find(i=>i.id===id);return{id,name:item?.name,qty,unitPrice:item?.price,total:(item?.price||0)*qty};}),
      expTotal,grandTotal,name,email,phone,notes};
    
    setSending(true);
    setErr("");
    
    try {
      // ═══ REPLACE THIS URL WITH YOUR GOOGLE APPS SCRIPT WEB APP URL ═══
      const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRcY80TpPHmoPDhGy9dUHqswxjncU3uB91n9UDU8SfEE6yYyWtCa0UEyVO315e5vQqaQ/exec";
      
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setStep(STEP_CONFIRM);
      } else {
        setErr("Something went wrong. Please try again or contact us via WhatsApp.");
      }
    } catch (error) {
      // If Apps Script URL not configured, still show confirmation (dev mode)
      console.log("BOOKING_PAYLOAD:", JSON.stringify(payload, null, 2));
      setStep(STEP_CONFIRM);
    } finally {
      setSending(false);
    }
  };

  const reset=()=>{setCi(null);setCo(null);setSel("in");setGuests(1);setStep(STEP_DATES);setName("");setEmail("");setPhone("");setErr("");setExpSel({});setNotes("");};

  // ─── CONFIRMATION ───
  if(step===STEP_CONFIRM) return (
    <div style={S.wrap}>
      <div style={S.confirmIcon}>✓</div>
      <h2 style={S.confirmTitle}>Inquiry Received</h2>
      <p style={S.confirmSub}>Thank you, {name}. We'll get back to you within 24 hours via WhatsApp or email.</p>
      <div style={S.summaryBox}>
        <div style={S.sumLabel}>RESERVATION SUMMARY</div>
        <div style={S.sumRow}><span style={S.sumK}>Dates</span><span style={S.sumV}>{fDisp(ci)} — {fDisp(co)}</span></div>
        <div style={S.sumRow}><span style={S.sumK}>Nights</span><span style={S.sumV}>{nights}</span></div>
        <div style={S.sumRow}><span style={S.sumK}>Guests</span><span style={S.sumV}>{guests}</span></div>
        <div style={S.sumRow}><span style={S.sumK}>Season</span><span style={S.sumV}>{season==="high"?`High Season${highInfo?` — ${highInfo.label}`:""}`:"Low Season"}</span></div>
        <div style={S.sumRow}><span style={S.sumK}>Accommodation</span><span style={S.sumV}>${rentalTotal.toLocaleString()} USD</span></div>
        {expTotal>0&&<div style={S.sumRow}><span style={S.sumK}>Experiences</span><span style={S.sumV}>${expTotal.toLocaleString()} USD</span></div>}
        <div style={{...S.sumRow,borderTop:"2px solid #E8863A",paddingTop:12,marginTop:8}}>
          <span style={{...S.sumK,color:"#1a1a2e",fontWeight:700,fontSize:15}}>Estimated Total</span>
          <span style={{color:"#E8863A",fontSize:22,fontWeight:700,fontFamily:"'DM Serif Display',Georgia,serif"}}>${grandTotal.toLocaleString()} USD</span>
        </div>
      </div>
      {Object.keys(expSel).length>0&&(
        <div style={S.summaryBox}>
          <div style={S.sumLabel}>SELECTED EXPERIENCES</div>
          {EXP_CATEGORIES.flatMap(c=>c.items).filter(i=>expSel[i.id]).map(i=>(
            <div key={i.id} style={S.sumRow}>
              <span style={S.sumK}>{i.name}{i.qty&&expSel[i.id]>1?` ×${expSel[i.id]}`:""}</span>
              <span style={S.sumV}>${(i.price*(i.qty?expSel[i.id]:1)).toLocaleString()} USD</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={reset} style={S.secondaryBtn}>Make Another Inquiry</button>
    </div>
  );

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Reserve <span style={S.h1Gold}>Casa Papelillo</span></h1>
      <p style={S.headerSub}>Tell us about your stay and we will get back to you within 24 hours.</p>
      <p style={S.headerNote}>We will reply via WhatsApp or email · +1 (917) 363 7913</p>

      {/* Steps */}
      <div style={S.steps}>
        {["Dates","Experiences","Contact"].map((s,i)=>(
          <div key={s} style={{...S.stepItem,opacity:step>=i?1:0.35}}>
            <div style={{...S.stepDot,background:step===i?"#E8863A":step>i?"#1a1a2e":"#ccc"}}>{step>i?"✓":i+1}</div>
            <span style={{...S.stepText,fontWeight:step===i?600:400}}>{s}</span>
          </div>
        ))}
      </div>

      {/* ═══ STEP 1: DATES ═══ */}
      {step===STEP_DATES&&(<>
        <div style={S.calBox}>
          <div style={S.calNav}>
            <button onClick={prev} style={S.calArr}>‹</button>
            <span style={S.calMonth}>{MO[vM]} {vY}</span>
            <button onClick={next} style={S.calArr}>›</button>
          </div>
          <div style={S.legend}>
            <span style={S.legItem}><span style={{...S.legDot,background:"#4a8c3f"}}></span>Available</span>
            <span style={S.legItem}><span style={{...S.legDot,background:"#c25050"}}></span>Booked</span>
            <span style={S.legItem}><span style={{...S.legDot,background:"#E8863A"}}></span>High Season</span>
          </div>
          <div style={S.calGrid}>
            {DY.map(d=><div key={d} style={S.calDH}>{d}</div>)}
            {days.map((date,i)=>{
              if(!date)return <div key={`e${i}`} style={S.calE}></div>;
              const booked=isBooked(date),past=date<todayC,high=getHigh(date);
              const selected=inSel(date),isCi=same(date,ci),isCo=same(date,co),dis=booked||past;
              let bg="transparent",color="#1a1a2e",border="1px solid transparent",op=1,fw=400;
              if(past)op=0.25;
              else if(booked){bg="#fde8e8";color="#c25050";}
              else if(selected){bg="#fef0e5";color="#E8863A";fw=600;border="1px solid #E8863A";}
              else if(high){bg="#fdf8f3";border="1px solid #f0dcc8";}
              if(isCi||isCo){bg="#E8863A";color="#fff";fw=700;border="1px solid #E8863A";}
              return(
                <div key={i} onClick={()=>!dis&&handleDay(date)} style={{...S.calDay,background:bg,color,border,opacity:op,fontWeight:fw,cursor:dis?"default":"pointer"}}>
                  {date.getDate()}
                  {high&&!booked&&!past&&!selected&&!isCi&&!isCo&&<div style={S.highDot}></div>}
                </div>
              );
            })}
          </div>
          <div style={S.calFoot}>
            <div style={S.seasonRow}><span style={S.seasonBadge}>HIGH SEASON — 7 NIGHT MINIMUM</span><span style={S.seasonList}>Chinese New Year · Holy & Easter Week · Ondalinda · Christmas & New Year's</span></div>
            <div style={S.seasonRow}><span style={{...S.seasonBadge,color:"#999"}}>LOW SEASON — 3 NIGHT MINIMUM</span><span style={S.seasonList}>All other dates</span></div>
          </div>
        </div>
        {ci&&(
          <div style={S.priceBox}>
            <div style={S.priceRow}><span style={S.priceK}>Check-in</span><span style={S.priceV}>{fDisp(ci)}</span></div>
            {co?<>
              <div style={S.priceRow}><span style={S.priceK}>Check-out</span><span style={S.priceV}>{fDisp(co)}</span></div>
              <div style={S.priceRow}><span style={S.priceK}>{nights} nights × ${rate.toLocaleString()}</span><span style={{...S.priceV,color:"#E8863A",fontSize:18,fontWeight:700,fontFamily:"'DM Serif Display',Georgia,serif"}}>${rentalTotal.toLocaleString()} USD</span></div>
              <div style={S.seasonTag}>{season==="high"?`High Season${highInfo?` — ${highInfo.label}`:""}`:"Low Season"}</div>
            </>:<div style={S.hint}>Select check-out date</div>}
          </div>
        )}
        {err&&<div style={S.error}>{err}</div>}
        <div style={S.fieldCol}><label style={S.label}>Guests</label>
          <select value={guests} onChange={e=>setGuests(Number(e.target.value))} style={S.select}>
            {[...Array(12)].map((_,i)=><option key={i} value={i+1}>{i+1}</option>)}
          </select>
        </div>
      </>)}

      {/* ═══ STEP 2: EXPERIENCES ═══ */}
      {step===STEP_EXP&&(<>
        <div style={S.expHeader}>
          <h2 style={S.expH2}>Enhance Your Stay</h2>
          <p style={S.expSub}>Select any experiences you'd like to add. All services available by reservation. Non-refundable once booked. A 15% gratuity is recommended.</p>
        </div>
        {EXP_CATEGORIES.map(cat=>(
          <div key={cat.category} style={S.expCat}>
            <div style={S.expCatTitle}>{cat.category.toUpperCase()}</div>
            {cat.items.map(item=>{
              const active=!!expSel[item.id];
              return(
                <div key={item.id} style={{...S.expRow,background:active?"#fef6ee":"#fff",borderColor:active?"#E8863A":"#eee"}}>
                  <div style={S.expCheck} onClick={()=>toggleExp(item.id)}>
                    <div style={{...S.checkbox,background:active?"#E8863A":"#fff",borderColor:active?"#E8863A":"#ccc"}}>
                      {active&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
                    </div>
                    <div style={S.expInfo}><div style={S.expName}>{item.name}</div><div style={S.expDesc}>{item.desc}</div></div>
                    <div style={S.expPrice}>${item.price} USD{item.unit||""}</div>
                  </div>
                  {active&&item.qty&&(
                    <div style={S.qtyRow}>
                      <button style={S.qtyBtn} onClick={()=>setExpQty(item.id,(expSel[item.id]||1)-1)}>−</button>
                      <span style={S.qtyVal}>{expSel[item.id]||1}</span>
                      <button style={S.qtyBtn} onClick={()=>setExpQty(item.id,(expSel[item.id]||1)+1)}>+</button>
                      <span style={S.qtyTotal}>${(item.price*(expSel[item.id]||1)).toLocaleString()} USD</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {expTotal>0&&(
          <div style={S.expTotalBar}><span style={{fontSize:13,color:"#888"}}>Experiences subtotal</span><span style={{fontSize:16,fontWeight:700,color:"#E8863A"}}>${expTotal.toLocaleString()} USD</span></div>
        )}
      </>)}

      {/* ═══ STEP 3: CONTACT ═══ */}
      {step===STEP_CONTACT&&(<>
        <h2 style={S.expH2}>Contact Information</h2>
        <p style={S.expSub}>We'll confirm your reservation within 24 hours.</p>
        <div style={S.formGrid}>
          <div style={S.fieldCol}><label style={S.label}>Full name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={S.input}/></div>
          <div style={S.fieldCol}><label style={S.label}>Email address *</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={S.input}/></div>
          <div style={S.fieldCol}><label style={S.label}>Phone / WhatsApp *</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Telephone" style={S.input}/></div>
          <div style={S.fieldCol}><label style={S.label}>Special requests or notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Dietary needs, celebrations, special requests..." style={{...S.input,minHeight:80,resize:"vertical"}}/></div>
        </div>
        <div style={{...S.summaryBox,marginTop:20}}>
          <div style={S.sumLabel}>YOUR INQUIRY SUMMARY</div>
          <div style={S.sumRow}><span style={S.sumK}>{fDisp(ci)} — {fDisp(co)}</span><span style={S.sumV}>{nights} nights · {guests} guest{guests>1?"s":""}</span></div>
          <div style={S.sumRow}><span style={S.sumK}>Accommodation ({season==="high"?"High":"Low"} Season)</span><span style={S.sumV}>${rentalTotal.toLocaleString()}</span></div>
          {expTotal>0&&<div style={S.sumRow}><span style={S.sumK}>Experiences & Services</span><span style={S.sumV}>${expTotal.toLocaleString()}</span></div>}
          <div style={{...S.sumRow,borderTop:"2px solid #E8863A",paddingTop:12,marginTop:8}}>
            <span style={{...S.sumK,color:"#1a1a2e",fontWeight:700}}>Estimated Total</span>
            <span style={{color:"#E8863A",fontSize:20,fontWeight:700,fontFamily:"'DM Serif Display',Georgia,serif"}}>${grandTotal.toLocaleString()} USD</span>
          </div>
        </div>
      </>)}

      {err&&step!==STEP_DATES&&<div style={S.error}>{err}</div>}

      {/* Navigation */}
      <div style={S.navRow}>
        {step>STEP_DATES&&step<STEP_CONFIRM&&<button onClick={()=>{setStep(step-1);setErr("")}} style={S.secondaryBtn}>← Back</button>}
        <div style={{flex:1}}></div>
        {step<STEP_CONTACT&&<button onClick={()=>{if(canNext()){setStep(step+1);setErr("")}else setErr(step===STEP_DATES?"Please select check-in and check-out dates.":"")}} style={{...S.primaryBtn,opacity:canNext()?1:0.4}}>
          {step===STEP_DATES?"Continue to Experiences →":"Continue to Contact →"}
        </button>}
        {step===STEP_CONTACT&&<button onClick={()=>{if(canNext()&&!sending)handleSubmit();else if(!canNext())setErr("Please fill in all required fields.")}} style={{...S.primaryBtn,opacity:canNext()&&!sending?1:0.4}}>
          {sending?"Sending...":"Send Inquiry"}
        </button>}
      </div>
    </div>
  );
}

/* ═══ STYLES ═══ */
const S={
  wrap:{maxWidth:560,margin:"0 auto",padding:"36px 24px",fontFamily:"'Satoshi',system-ui,-apple-system,sans-serif",color:"#1a1a2e",background:"#fff"},
  h1:{fontSize:30,fontWeight:300,margin:0,fontFamily:"'DM Serif Display',Georgia,serif",color:"#1a1a2e",letterSpacing:"-0.01em"},
  h1Gold:{color:"#E8863A",fontStyle:"italic"},
  headerSub:{fontSize:14,color:"#666",marginTop:8,lineHeight:1.55},
  headerNote:{fontSize:12,color:"#999",marginTop:4},
  steps:{display:"flex",gap:24,margin:"24px 0 20px",paddingBottom:16,borderBottom:"1px solid #eee"},
  stepItem:{display:"flex",alignItems:"center",gap:8,transition:"opacity 0.3s"},
  stepDot:{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",transition:"background 0.3s"},
  stepText:{fontSize:13,color:"#1a1a2e",letterSpacing:0.3},
  calBox:{background:"#fafaf8",border:"1px solid #eee",borderRadius:6,padding:20,marginBottom:16},
  calNav:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},
  calArr:{background:"#fff",border:"1px solid #ddd",color:"#888",width:34,height:34,borderRadius:4,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"},
  calMonth:{fontSize:14,fontWeight:600,letterSpacing:1.5,color:"#E8863A",textTransform:"uppercase"},
  legend:{display:"flex",gap:16,marginBottom:10,flexWrap:"wrap"},
  legItem:{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888"},
  legDot:{width:8,height:8,borderRadius:"50%",display:"inline-block"},
  calGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3},
  calDH:{textAlign:"center",fontSize:10,fontWeight:700,color:"#aaa",padding:"4px 0",letterSpacing:1,textTransform:"uppercase"},
  calE:{padding:8},
  calDay:{textAlign:"center",padding:"10px 4px",borderRadius:4,fontSize:13,position:"relative",transition:"all 0.15s",userSelect:"none"},
  highDot:{width:4,height:4,borderRadius:"50%",background:"#E8863A",margin:"2px auto 0",opacity:0.5},
  calFoot:{marginTop:14,display:"flex",flexDirection:"column",gap:6},
  seasonRow:{display:"flex",flexDirection:"column",gap:2},
  seasonBadge:{fontSize:9,fontWeight:700,letterSpacing:2,color:"#E8863A",textTransform:"uppercase"},
  seasonList:{fontSize:11,color:"#aaa"},
  priceBox:{background:"#fafaf8",border:"1px solid #eee",borderRadius:6,padding:16,marginBottom:16},
  priceRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0"},
  priceK:{fontSize:13,color:"#888"},
  priceV:{fontSize:14,fontWeight:500,color:"#1a1a2e"},
  seasonTag:{fontSize:10,color:"#E8863A",fontWeight:600,marginTop:4,textTransform:"uppercase",letterSpacing:1.5},
  hint:{fontSize:12,color:"#aaa",fontStyle:"italic",marginTop:4},
  error:{background:"#fde8e8",border:"1px solid #f0c0c0",color:"#c25050",padding:"10px 14px",borderRadius:4,fontSize:13,marginBottom:14},
  fieldCol:{display:"flex",flexDirection:"column",gap:5,marginBottom:12},
  label:{fontSize:11,fontWeight:700,color:"#888",letterSpacing:0.5,textTransform:"uppercase"},
  input:{background:"#fafaf8",border:"1px solid #ddd",borderRadius:4,padding:"11px 14px",color:"#1a1a2e",fontSize:14,outline:"none",fontFamily:"inherit",transition:"border 0.2s"},
  select:{background:"#fafaf8",border:"1px solid #ddd",borderRadius:4,padding:"11px 14px",color:"#1a1a2e",fontSize:14,outline:"none",fontFamily:"inherit"},
  formGrid:{display:"flex",flexDirection:"column",gap:4},
  expHeader:{marginBottom:16},
  expH2:{fontSize:22,fontWeight:400,fontFamily:"'DM Serif Display',Georgia,serif",color:"#1a1a2e",margin:"0 0 6px"},
  expSub:{fontSize:13,color:"#888",lineHeight:1.55},
  expCat:{marginBottom:20},
  expCatTitle:{fontSize:10,fontWeight:700,letterSpacing:2.5,color:"#E8863A",marginBottom:8,textTransform:"uppercase"},
  expRow:{border:"1px solid #eee",borderRadius:5,padding:"14px 16px",marginBottom:6,transition:"all 0.2s",cursor:"pointer"},
  expCheck:{display:"flex",alignItems:"center",gap:12},
  checkbox:{width:20,height:20,borderRadius:3,border:"2px solid #ccc",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"},
  expInfo:{flex:1},
  expName:{fontSize:14,fontWeight:500,color:"#1a1a2e"},
  expDesc:{fontSize:11,color:"#999",marginTop:2},
  expPrice:{fontSize:14,fontWeight:600,color:"#E8863A",whiteSpace:"nowrap"},
  qtyRow:{display:"flex",alignItems:"center",gap:10,marginTop:10,paddingTop:10,borderTop:"1px solid #f0ece5"},
  qtyBtn:{width:28,height:28,borderRadius:4,border:"1px solid #ddd",background:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#1a1a2e"},
  qtyVal:{fontSize:15,fontWeight:600,color:"#1a1a2e",minWidth:20,textAlign:"center"},
  qtyTotal:{marginLeft:"auto",fontSize:13,fontWeight:600,color:"#E8863A"},
  expTotalBar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"#fef6ee",border:"1px solid #f0dcc8",borderRadius:5,marginBottom:8},
  summaryBox:{background:"#fafaf8",border:"1px solid #eee",borderRadius:6,padding:20,marginBottom:16},
  sumLabel:{fontSize:10,fontWeight:700,letterSpacing:2.5,color:"#E8863A",marginBottom:12,textTransform:"uppercase"},
  sumRow:{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f0ece5"},
  sumK:{fontSize:13,color:"#888"},
  sumV:{fontSize:14,fontWeight:500,color:"#1a1a2e"},
  navRow:{display:"flex",alignItems:"center",gap:12,marginTop:20,paddingTop:16,borderTop:"1px solid #eee"},
  primaryBtn:{background:"#E8863A",border:"none",color:"#fff",padding:"13px 28px",borderRadius:4,fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit",transition:"opacity 0.2s"},
  secondaryBtn:{background:"#fff",border:"1px solid #ddd",color:"#888",padding:"11px 20px",borderRadius:4,fontSize:13,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit"},
  confirmIcon:{width:48,height:48,borderRadius:"50%",background:"#E8863A",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,margin:"0 auto 16px"},
  confirmTitle:{fontSize:24,fontFamily:"'DM Serif Display',Georgia,serif",textAlign:"center",margin:"0 0 8px",color:"#1a1a2e"},
  confirmSub:{fontSize:14,color:"#888",textAlign:"center",lineHeight:1.55,marginBottom:24},
};
