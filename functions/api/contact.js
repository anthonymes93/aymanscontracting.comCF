export async function onRequestPost({request,env}) {
  const json=(body,status)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  let data;try{data=await request.json()}catch{return json({error:"Invalid request"},400)}
  const name=String(data.name||"").trim(),email=String(data.email||"").trim(),message=String(data.message||"").trim(),token=String(data.turnstileToken||"");
  if(!name||name.length>150||!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length>10000||!token)return json({error:"Please complete the required fields and verification."},400);
  if(!env.TURNSTILE_SECRET_KEY||!env.RESEND_API_KEY||!env.CONTACT_TO_EMAIL||!env.CONTACT_FROM_EMAIL)return json({error:"Contact service is not configured yet."},503);
  const ip=request.headers.get("CF-Connecting-IP")||"";
  const form=new FormData();form.set("secret",env.TURNSTILE_SECRET_KEY);form.set("response",token);if(ip)form.set("remoteip",ip);
  try{
    const check=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
    const result=await check.json();
    if(!result.success)return json({error:"Verification failed. Please try again."},403);
  }catch{return json({error:"Verification service unavailable. Please try again."},502)}
  const esc=s=>s.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  try{
    const result=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({
      from:env.CONTACT_FROM_EMAIL,to:[env.CONTACT_TO_EMAIL],reply_to:email,subject:"Aymans Contracting — New contact form submission",
      html:"<h2>New website enquiry</h2><p><strong>Name:</strong> "+esc(name)+"</p><p><strong>Email:</strong> "+esc(email)+"</p><p><strong>Message:</strong></p><p style=\"white-space:pre-wrap\">"+esc(message||"(No message provided)")+"</p>",
      text:"New website enquiry\nName: "+name+"\nEmail: "+email+"\nMessage:\n"+(message||"(No message provided)")
    })});
    if(!result.ok){console.error("Resend rejected contact:",result.status,await result.text());return json({error:"Email service could not send your message. Please try again."},502)}
    return json({success:true},200);
  }catch(error){console.error("Contact email failure:",error);return json({error:"Email service unavailable. Please try again."},502)}
}
export function onRequestGet(){return new Response("Method Not Allowed",{status:405})}
