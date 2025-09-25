/**
 * Cloudflare Pages Function to handle contact form submissions
 * Verifies Turnstile token and sends email via MailChannels
 */

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // Parse form data
        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        
        // Extract form fields
        const {
            name,
            email,
            phone,
            company,
            serviceType,
            projectDetails,
            budgetRange,
            timeline,
            'cf-turnstile-response': turnstileToken
        } = data;
        
        // Validate required fields
        if (!name || !email || !projectDetails) {
            return new Response(
                generateErrorPage('Please fill in all required fields.'),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'text/html' }
                }
            );
        }
        
        // Verify Turnstile token
        if (!turnstileToken) {
            return new Response(
                generateErrorPage('Please complete the verification challenge.'),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'text/html' }
                }
            );
        }
        
        const turnstileResult = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET);
        if (!turnstileResult.success) {
            return new Response(
                generateErrorPage('Verification failed. Please try again.'),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'text/html' }
                }
            );
        }
        
        // Send email via MailChannels
        const emailResult = await sendEmail({
            name,
            email,
            phone,
            company,
            serviceType,
            projectDetails,
            budgetRange,
            timeline
        }, env.CONTACT_TO);
        
        if (!emailResult.success) {
            return new Response(
                generateErrorPage('There was an error sending your message. Please try again or contact us directly.'),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'text/html' }
                }
            );
        }
        
        // Return success page
        return new Response(
            generateSuccessPage(name),
            { 
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }
        );
        
    } catch (error) {
        console.error('Contact form error:', error);
        return new Response(
            generateErrorPage('An unexpected error occurred. Please try again later.'),
            { 
                status: 500,
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }
}

/**
 * Verify Turnstile token with Cloudflare
 */
async function verifyTurnstile(token, secret) {
    if (!secret) {
        console.error('TURNSTILE_SECRET environment variable not set');
        return { success: false };
    }
    
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });
        
        return await response.json();
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return { success: false };
    }
}

/**
 * Send email via MailChannels
 */
async function sendEmail(formData, toEmail) {
    if (!toEmail) {
        console.error('CONTACT_TO environment variable not set');
        return { success: false };
    }
    
    const {
        name,
        email,
        phone,
        company,
        serviceType,
        projectDetails,
        budgetRange,
        timeline
    } = formData;
    
    // Format service type for display
    const serviceTypeDisplay = serviceType ? 
        serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
        'Not specified';
    
    // Create email content
    const emailHtml = `
        <h2>New Contact Form Submission - SoundForYou</h2>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Contact Information</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        ${phone ? `<p><strong>Phone:</strong> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>` : ''}
        ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
        
        <h3>Project Information</h3>
        <p><strong>Service Interest:</strong> ${escapeHtml(serviceTypeDisplay)}</p>
        ${budgetRange ? `<p><strong>Budget Range:</strong> ${escapeHtml(budgetRange.replace(/-/g, ' '))}</p>` : ''}
        ${timeline ? `<p><strong>Timeline:</strong> ${escapeHtml(timeline.replace(/-/g, ' '))}</p>` : ''}
        
        <h3>Project Details</h3>
        <p>${escapeHtml(projectDetails).replace(/\n/g, '<br>')}</p>
        
        <hr>
        <p><em>This message was sent via the SoundForYou website contact form.</em></p>
    `;
    
    const emailText = `
New Contact Form Submission - SoundForYou
Submitted: ${new Date().toLocaleString()}

Contact Information:
Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
${company ? `Company: ${company}` : ''}

Project Information:
Service Interest: ${serviceTypeDisplay}
${budgetRange ? `Budget Range: ${budgetRange.replace(/-/g, ' ')}` : ''}
${timeline ? `Timeline: ${timeline.replace(/-/g, ' ')}` : ''}

Project Details:
${projectDetails}

---
This message was sent via the SoundForYou website contact form.
    `;
    
    const emailData = {
        personalizations: [
            {
                to: [{ email: toEmail }],
                reply_to: { email: email, name: name }
            }
        ],
        from: {
            email: "noreply@soundforyou.pages.dev",
            name: "SoundForYou Website"
        },
        subject: `New Contact Form Submission from ${name}`,
        content: [
            {
                type: "text/plain",
                value: emailText
            },
            {
                type: "text/html",
                value: emailHtml
            }
        ]
    };
    
    try {
        const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });
        
        if (response.ok) {
            return { success: true };
        } else {
            console.error('MailChannels error:', response.status, response.statusText);
            return { success: false };
        }
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false };
    }
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate success page HTML
 */
function generateSuccessPage(name) {
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
        <div class="header-container">
            <a href="/" class="logo" aria-label="SoundForYou Home">
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                    <defs>
                        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#e6f3ff;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle cx="20" cy="20" r="18" fill="url(#brandGradient)" stroke="#ffffff" stroke-width="2"/>
                    <g stroke="#1e3a5f" stroke-width="2" fill="none">
                        <circle cx="20" cy="20" r="4" fill="#1e3a5f"/>
                        <path d="M 8 20 Q 14 14, 20 20 Q 14 26, 8 20" stroke-opacity="0.8"/>
                        <path d="M 32 20 Q 26 14, 20 20 Q 26 26, 32 20" stroke-opacity="0.8"/>
                        <path d="M 5 20 Q 12 12, 20 20 Q 12 28, 5 20" stroke-opacity="0.6"/>
                        <path d="M 35 20 Q 28 12, 20 20 Q 28 28, 35 20" stroke-opacity="0.6"/>
                    </g>
                    <g fill="#1e3a5f" opacity="0.9">
                        <circle cx="14" cy="10" r="1.5"/>
                        <circle cx="26" cy="30" r="1.5"/>
                    </g>
                </svg>
                SoundForYou
            </a>
            <nav role="navigation" aria-label="Main navigation">
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/services.html">Services</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <section class="section">
            <div class="container">
                <div class="form-container" style="text-align: center;">
                    <h1 style="color: var(--brand-color); margin-bottom: 2rem;">Thank You!</h1>
                    <div style="font-size: 4rem; margin-bottom: 2rem;">✅</div>
                    <p style="font-size: 1.25rem; margin-bottom: 2rem;">
                        Hi ${escapeHtml(name)}, your message has been sent successfully!
                    </p>
                    <p style="margin-bottom: 2rem;">
                        We've received your inquiry and will get back to you within 24 hours to discuss your audio project needs.
                    </p>
                    <div style="margin-top: 3rem;">
                        <a href="/" class="cta-button" style="margin-right: 1rem;">Return to Home</a>
                        <a href="/services.html" class="cta-button" style="background-color: transparent; color: var(--brand-color); border: 2px solid var(--brand-color);">View Our Services</a>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-links">
                <a href="/">Home</a>
                <a href="/services.html">Services</a>
                <a href="/contact.html">Contact</a>
            </div>
            <p>&copy; 2024 SoundForYou. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
}

/**
 * Generate error page HTML
 */
function generateErrorPage(errorMessage) {
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
        <div class="header-container">
            <a href="/" class="logo" aria-label="SoundForYou Home">
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                    <defs>
                        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#e6f3ff;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle cx="20" cy="20" r="18" fill="url(#brandGradient)" stroke="#ffffff" stroke-width="2"/>
                    <g stroke="#1e3a5f" stroke-width="2" fill="none">
                        <circle cx="20" cy="20" r="4" fill="#1e3a5f"/>
                        <path d="M 8 20 Q 14 14, 20 20 Q 14 26, 8 20" stroke-opacity="0.8"/>
                        <path d="M 32 20 Q 26 14, 20 20 Q 26 26, 32 20" stroke-opacity="0.8"/>
                        <path d="M 5 20 Q 12 12, 20 20 Q 12 28, 5 20" stroke-opacity="0.6"/>
                        <path d="M 35 20 Q 28 12, 20 20 Q 28 28, 35 20" stroke-opacity="0.6"/>
                    </g>
                    <g fill="#1e3a5f" opacity="0.9">
                        <circle cx="14" cy="10" r="1.5"/>
                        <circle cx="26" cy="30" r="1.5"/>
                    </g>
                </svg>
                SoundForYou
            </a>
            <nav role="navigation" aria-label="Main navigation">
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/services.html">Services</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <section class="section">
            <div class="container">
                <div class="form-container" style="text-align: center;">
                    <h1 style="color: #dc3545; margin-bottom: 2rem;">Oops! Something went wrong</h1>
                    <div style="font-size: 4rem; margin-bottom: 2rem;">❌</div>
                    <p style="font-size: 1.25rem; margin-bottom: 2rem;">
                        ${escapeHtml(errorMessage)}
                    </p>
                    <div style="margin-top: 3rem;">
                        <a href="/contact.html" class="cta-button">Try Again</a>
                        <p style="margin-top: 2rem;">
                            Or contact us directly at <a href="mailto:info@soundforyou.com" style="color: var(--brand-color);">info@soundforyou.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-links">
                <a href="/">Home</a>
                <a href="/services.html">Services</a>
                <a href="/contact.html">Contact</a>
            </div>
            <p>&copy; 2024 SoundForYou. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
}