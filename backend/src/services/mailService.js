import nodemailer from "nodemailer";
import axios from "axios";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const sendJobApplicationEmail = async ({
  recruiterEmail,
  recruiterName = 'Hiring Manager',
  jobTitle,
  companyName,
  applicantName,
  applicantEmail,
  applicantPhone,
  resumeUrl,
  message = ''
}) => {
  try {
    let resumeAttachment;

    if (resumeUrl) {
      const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
      resumeAttachment = {
        filename: `${applicantName.replace(/\s+/g, '_')}_Resume.pdf`,
        content: Buffer.from(response.data),
        contentType: 'application/pdf'
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recruiterEmail,
      subject: `Job Application for ${jobTitle} - ${applicantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-row { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Job Application</h1>
              <p>${jobTitle} at ${companyName}</p>
            </div>
            <div class="content">
              <p>Dear ${recruiterName},</p>
              <p>You have received a new job application for the position of <strong>${jobTitle}</strong>.</p>
              
              <h3>Applicant Details:</h3>
              <div class="info-row">
                <span class="label">Name:</span> ${applicantName}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> <a href="mailto:${applicantEmail}">${applicantEmail}</a>
              </div>
              ${applicantPhone ? `
              <div class="info-row">
                <span class="label">Phone:</span> ${applicantPhone}
              </div>
              ` : ''}
              
              ${message ? `
              <h3>Cover Message:</h3>
              <div class="info-row">
                ${message}
              </div>
              ` : ''}
              
              <p style="margin-top: 30px;">
                <strong>Resume attached:</strong> Please find the applicant's resume attached to this email.
              </p>
              
              <p>Best regards,<br>Velocity Job Platform</p>
            </div>
            <div class="footer">
              <p>This is an automated email from Velocity Job Application Platform</p>
              <p>Please do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: resumeAttachment ? [resumeAttachment] : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Application email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending job application email:', error);
    throw new Error(`Failed to send application email: ${error.message}`);
  }
};

export const sendMatchingJobMail = async ({
  userEmail,
  userName,
  jobTitle,
  companyName,
  jobDescription,
  jobLocation,
  jobType,
  salary,
  applyLink,
  postedDate
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `🎯 New Job Match: ${jobTitle} at ${companyName}`,
      html: `
        hello world
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Job matching email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending job matching email:', error);
    throw new Error(`Failed to send job matching email: ${error.message}`);
  }
};

/**
 * Send job alert email with multiple jobs
 * @param {Object} params
 * @param {string} params.userEmail - Recipient email
 * @param {string} params.userName - Recipient name
 * @param {string} params.alertTitle - Alert name/title
 * @param {Array} params.jobs - Array of job objects to include
 */
export const sendJobAlertEmail = async ({
  userEmail,
  userName = 'Job Seeker',
  alertTitle,
  jobs = []
}) => {
  try {
    if (!jobs.length) {
      throw new Error('No jobs to send');
    }

    // Format salary display
    const formatSalary = (salary) => {
      if (!salary || (!salary.min && !salary.max)) return 'Not specified';
      const currency = salary.currency || 'USD';
      const period = salary.period || 'yearly';
      if (salary.min && salary.max) {
        return `${currency} ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()} / ${period}`;
      }
      return `${currency} ${(salary.min || salary.max).toLocaleString()} / ${period}`;
    };

    // Generate job cards HTML (1-indexed as per user requirement)
    const jobCardsHtml = jobs.map((job, index) => `
      <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #667eea;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          ${job.companyLogo ? `
            <img src="${job.companyLogo}" alt="${job.company}" style="width: 56px; height: 56px; border-radius: 8px; object-fit: contain; background: #f5f5f5;">
          ` : `
            <div style="width: 56px; height: 56px; border-radius: 8px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
              ${job.company.charAt(0).toUpperCase()}
            </div>
          `}
          <div style="flex: 1;">
            <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Job #${index + 1}</div>
            <h3 style="margin: 0 0 8px 0; color: #1a1a2e; font-size: 18px;">${job.title}</h3>
            <p style="margin: 0 0 12px 0; color: #667eea; font-weight: 500;">${job.company}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; font-size: 13px; color: #666;">
              <span>📍 ${job.location || 'Remote'}</span>
              <span>💼 ${job.employmentType || 'Full-time'}</span>
              <span>💰 ${formatSalary(job.salary)}</span>
              ${job.isRemote ? '<span style="background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 4px; font-size: 11px;">🌐 Remote</span>' : ''}
            </div>
            <p style="margin: 0 0 16px 0; color: #555; font-size: 14px; line-height: 1.5;">
              ${job.descriptionSnippet || job.description?.substring(0, 200) + '...' || 'No description available.'}
            </p>
            <a href="${job.applyLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
              Apply Now →
            </a>
          </div>
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `🚀 ${jobs.length} New Job${jobs.length > 1 ? 's' : ''} Matching "${alertTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5;">
          <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0 0 8px 0; font-size: 28px;">🎯 New Job Matches</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 16px;">We found ${jobs.length} job${jobs.length > 1 ? 's' : ''} matching your alert</p>
            </div>

            <!-- Alert Info -->
            <div style="background: #ffffff; padding: 24px 30px; border-bottom: 1px solid #eee;">
              <p style="margin: 0; color: #333;">
                Hi <strong>${userName}</strong> 👋
              </p>
              <p style="margin: 12px 0 0 0; color: #666;">
                Great news! We found new job opportunities matching your alert: <strong>"${alertTitle}"</strong>
              </p>
            </div>

            <!-- Job Cards -->
            <div style="background: #f8f9fa; padding: 24px;">
              ${jobCardsHtml}
            </div>

            <!-- Footer -->
            <div style="background: #1a1a2e; color: #aaa; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 12px 0; font-size: 14px;">
                This email was sent by <strong style="color: #667eea;">Velocity</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #777;">
                You're receiving this because you have job alerts enabled.<br>
                Manage your alerts in your Velocity dashboard.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Job alert email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending job alert email:', error);
    throw new Error(`Failed to send job alert email: ${error.message}`);
  }
};