import React, { useState } from 'react';
import { ChevronRight, ExternalLink, Mail, Bug, HelpCircle } from 'lucide-react';
import { PanelHeader, SectionLabel, InfoBox } from './shared';
import { SubmitButton } from '../buttonFormat';

interface HelpCenterPanelProps {
  onBack: () => void;
}

export const HelpCenterPanel: React.FC<HelpCenterPanelProps> = ({ onBack }) => {
  const [bugReport, setBugReport] = useState('');
  const [supportRequest, setSupportRequest] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [isRequestingSupport, setIsRequestingSupport] = useState(false);
  const [showBugReportPanel, setShowBugReportPanel] = useState(false);
  const [showSupportRequestPanel, setShowSupportRequestPanel] = useState(false);

  const handleOpenDocumentation = () => {
    window.open('https://docs.skhoot.com', '_blank');
  };

  const handleSubmitSupportRequest = async () => {
    if (!supportRequest.trim()) {
      alert('Please describe your issue before submitting.');
      return;
    }
    
    setIsRequestingSupport(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Support request sent successfully! Our team will respond within 24 hours.');
      setSupportRequest('');
      setShowSupportRequestPanel(false);
    } catch (error) {
      alert('Failed to send support request. Please try again.');
    } finally {
      setIsRequestingSupport(false);
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugReport.trim()) {
      alert('Please describe the bug before submitting.');
      return;
    }
    
    setIsSubmittingBug(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Bug report submitted successfully! We will investigate and respond within 24 hours.');
      setBugReport('');
      setShowBugReportPanel(false);
    } catch (error) {
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  // Bug Report Sub-panel
  if (showBugReportPanel) {
    return (
      <div className="space-y-6">
        <PanelHeader title="Report a Bug" onBack={() => setShowBugReportPanel(false)} />

        <div className="text-center space-y-4 mb-6">
          <div className="flex justify-center">
            <img 
              src="/skhoot-purple.svg" 
              alt="Skhoot" 
              className="w-16 h-16"
              style={{ filter: 'brightness(0) saturate(100%) invert(12%) sepia(87%) saturate(7426%) hue-rotate(357deg) brightness(95%) contrast(95%)' }}
            />
          </div>
          <div>
            <h4 className="text-lg font-bold font-jakarta text-gray-700 mb-2">Found a Bug?</h4>
            <p className="text-sm text-gray-500 font-jakarta">
              Please describe the issue in detail and our development team will investigate and respond within 24 hours.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <SectionLabel label="Describe the Bug" description="Please provide as much detail as possible about the issue you encountered." />
          <textarea
            value={bugReport}
            onChange={(e) => setBugReport(e.target.value)}
            placeholder="Describe what happened, what you expected to happen, and steps to reproduce the issue..."
            rows={6}
            className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium font-jakarta focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <SubmitButton
          onClick={handleSubmitBugReport}
          disabled={!bugReport.trim()}
          isSubmitting={isSubmittingBug}
          submitText="Submit Bug Report"
          submittingText="Submitting..."
          variant="danger"
        />
      </div>
    );
  }

  // Support Request Sub-panel
  if (showSupportRequestPanel) {
    return (
      <div className="space-y-6">
        <PanelHeader title="Request Assistance" onBack={() => setShowSupportRequestPanel(false)} />

        <div className="text-center space-y-4 mb-6">
          <div className="flex justify-center">
            <img src="/skhoot-purple.svg" alt="Skhoot" className="w-16 h-16" />
          </div>
          <div>
            <h4 className="text-lg font-bold font-jakarta text-gray-700 mb-2">How can we help you?</h4>
            <p className="text-sm text-gray-500 font-jakarta">
              Please describe your issue in detail and our support team will respond via email within 24 hours.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <SectionLabel label="Describe Your Issue" />
          <textarea
            value={supportRequest}
            onChange={(e) => setSupportRequest(e.target.value)}
            placeholder="Please provide details about your question or issue. The more information you provide, the better we can assist you..."
            rows={6}
            className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium font-jakarta focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <SubmitButton
          onClick={handleSubmitSupportRequest}
          disabled={!supportRequest.trim()}
          isSubmitting={isRequestingSupport}
          submitText="Send Support Request"
          submittingText="Sending Request..."
          variant="violet"
        />
      </div>
    );
  }

  // Main Help Center Panel
  return (
    <div className="space-y-6">
      <PanelHeader title="Help Center" onBack={onBack} />

      {/* Documentation */}
      <div className="space-y-3">
        <SectionLabel label="Documentation" description="Access our comprehensive guides and tutorials" />
        <button
          onClick={handleOpenDocumentation}
          className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center" style={{ borderColor: '#c0b7c9' }}>
              <ExternalLink size={18} style={{ color: '#c0b7c9' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-jakarta text-gray-700">Open Documentation</p>
              <p className="text-xs text-gray-500 font-jakarta">View guides, tutorials, and FAQs</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Request Support */}
      <div className="space-y-3">
        <SectionLabel label="Get Support" description="Need help? Our team will respond within 24 hours" />
        <button
          onClick={() => setShowSupportRequestPanel(true)}
          className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center" style={{ borderColor: '#c0b7c9' }}>
              <Mail size={18} style={{ color: '#c0b7c9' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-jakarta text-gray-700">Request Assistance</p>
              <p className="text-xs text-gray-500 font-jakarta">Contact our support team</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Report Bug */}
      <div className="space-y-3">
        <SectionLabel label="Report Issues" description="Found a bug? Help us improve by reporting it" />
        <button
          onClick={() => setShowBugReportPanel(true)}
          className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Bug size={18} className="text-red-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-jakarta text-gray-700">Report a Bug</p>
              <p className="text-xs text-gray-500 font-jakarta">Submit bug reports and issues</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Contact Info */}
      <InfoBox
        icon={<HelpCircle size={16} className="text-[#5a7a94]" />}
        title="Need Immediate Help?"
        description="For urgent issues, all support requests and bug reports are handled within 24 hours by our dedicated team."
        variant="info"
      />
    </div>
  );
};

export default HelpCenterPanel;
