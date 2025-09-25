export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const service = formData.get('service')?.toString().trim();
    const projectType = formData.get('project-type')?.toString().trim();
    const timeline = formData.get('timeline')?.toString().trim();
    const message = formData.get('message')?.toString().trim();
    const turnstileToken = formData.get('cf-turnstile-response');
    
    // Basic validation
    if (!name || !email || !message) {
      return new Response(generateErrorHTML('Please fill in all required fields.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(generateErrorHTML('Please enter a valid email address.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Verify Turnstile token
    if (!turnstileToken) {
      return new Response(generateErrorHTML('Please complete the security verification.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${env.TURNSTILE_SECRET}&response=${turnstileToken}`,
    });
    
    const turnstileResult = await turnstileResponse.json();
    
    if (!turnstileResult.success) {
      return new Response(generateErrorHTML('Security verification failed. Please try again.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Prepare email content
    const emailSubject = `New Contact Form Submission from ${name}`;
    const emailBody = `
New contact form submission from SoundForYou website:

Name: ${name}
Email: ${email}
Service of Interest: ${service || 'Not specified'}
Project Type: ${projectType || 'Not specified'}
Timeline: ${timeline || 'Not specified'}

Message:
${message}

---
This email was sent from the SoundForYou contact form.
Reply directly to ${email} to respond to this inquiry.
    `.trim();
    
    // Send email via MailChannels
    const mailResponse = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: env.CONTACT_TO }],
            subject: emailSubject,
          },
        ],
        from: {
          email: 'noreply@soundforyou.com',
          name: 'SoundForYou Website',
        },
        reply_to: {
          email: email,
          name: name,
        },
        content: [
          {
            type: 'text/plain',
            value: emailBody,
          },
        ],
      }),
    });
    
    if (!mailResponse.ok) {
      console.error('MailChannels error:', await mailResponse.text());
      return new Response(generateErrorHTML('There was an error sending your message. Please try again later.'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Return success page
    return new Response(generateSuccessHTML(name), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(generateErrorHTML('There was an unexpected error. Please try again later.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

function generateSuccessHTML(name) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message Sent - SoundForYou</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
</head>
<body>
    <header>
        <nav class="nav-container">
            <div class="nav-brand">
                <img src="/assets/logo.svg" alt="SoundForYou" class="logo">
                <span class="brand-name">SoundForYou</span>
            </div>
            <ul class="nav-links">
                <li><a href="/index.html" class="nav-link">Home</a></li>
                <li><a href="/services.html" class="nav-link">Services</a></li>
                <li><a href="/contact.html" class="nav-link">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section class="page-hero">
            <div class="container">
                <h1>Thank You, ${name}!</h1>
                <p class="page-intro">Your message has been sent successfully.</p>
            </div>
        </section>

        <section class="contact-section">
            <div class="container" style="text-align: center; max-width: 600px;">
                <div class="feature-card">
                    <h2>Message Received</h2>
                    <p>Thank you for getting in touch with SoundForYou. We've received your message and will respond within 24 hours.</p>
                    <p>We're excited to learn more about your project and discuss how we can help bring your audio vision to life.</p>
                    <div style="margin-top: 2rem;">
                        <a href="/index.html" class="btn btn-primary">Return Home</a>
                        <a href="/services.html" class="btn btn-secondary" style="margin-left: 1rem;">View Services</a>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2024 SoundForYou. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
  `;
}

function generateErrorHTML(errorMessage) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - SoundForYou</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
</head>
<body>
    <header>
        <nav class="nav-container">
            <div class="nav-brand">
                <img src="/assets/logo.svg" alt="SoundForYou" class="logo">
                <span class="brand-name">SoundForYou</span>
            </div>
            <ul class="nav-links">
                <li><a href="/index.html" class="nav-link">Home</a></li>
                <li><a href="/services.html" class="nav-link">Services</a></li>
                <li><a href="/contact.html" class="nav-link">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section class="page-hero">
            <div class="container">
                <h1>Oops, Something Went Wrong</h1>
                <p class="page-intro">There was an issue processing your request.</p>
            </div>
        </section>

        <section class="contact-section">
            <div class="container" style="text-align: center; max-width: 600px;">
                <div class="feature-card" style="border-left: 4px solid #dc2626;">
                    <h2>Error</h2>
                    <p style="color: #dc2626; font-weight: 600;">${errorMessage}</p>
                    <div style="margin-top: 2rem;">
                        <a href="/contact.html" class="btn btn-primary">Try Again</a>
                        <a href="/index.html" class="btn btn-secondary" style="margin-left: 1rem;">Return Home</a>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2024 SoundForYou. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
  `;
}