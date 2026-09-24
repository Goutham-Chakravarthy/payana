import React, { useState, useRef, useEffect } from 'react';
import { runBillOCR, ScanBillResult } from '../../lib/scanner/ocrService';
import { formatINR } from '../../lib/formatters';
import {
  Camera,
  Upload,
  Sparkles,
  Edit2,
  Check,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  PenLine,
} from 'lucide-react';

interface BillScannerProps {
  onScanComplete: (result: {
    merchant: string;
    amount: number;
    date: string;
    originalImage: string | null;
    rawText: string;
  }) => void;
  onEnterManually: () => void;
  onCancel: () => void;
}

export const BillScanner: React.FC<BillScannerProps> = ({
  onScanComplete,
  onEnterManually,
  onCancel,
}) => {
  // Scanner stages: 'idle' | 'camera-active' | 'scanning' | 'result-confirm' | 'error'
  const [stage, setStage] = useState<
    'idle' | 'camera-active' | 'scanning' | 'result-confirm' | 'error'
  >('idle');

  // Preview & Processing state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Scanning your bill...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted Result State (Prompt Section 10)
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [amountInput, setAmountInput] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');
  const [isEditingResult, setIsEditingResult] = useState(false);

  // Camera references
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // 1. Camera Capture
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setStage('camera-active');

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn('Video play error:', e));
        }
      }, 100);
    } catch (err: any) {
      console.warn('Direct camera stream not supported or denied, triggering native file capture:', err);
      // Fallback directly to file picker with camera capture attribute
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      processImage(dataUrl);
    }
  };

  // 2. File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImage(file);
  };

  // 3. Execution of OCR pipeline
  const processImage = async (imageInput: File | string) => {
    try {
      setStage('scanning');
      setErrorMessage(null);
      setProgressPercent(10);
      setStatusMessage('Scanning your bill... Reading the text');

      if (typeof imageInput === 'string') {
        setSelectedImage(imageInput);
      }

      const result: ScanBillResult = await runBillOCR(imageInput, (msg, pct) => {
        setStatusMessage(msg);
        if (pct) setProgressPercent(pct);
      });

      setSelectedImage(result.originalImage);
      setMerchant(result.merchant || 'General Merchant');
      setAmount(result.amount);
      setAmountInput(result.amount > 0 ? String(result.amount) : '');
      setDate(result.date);
      setRawText(result.rawText);

      // Section 10: Show OCR Result Confirmation Screen
      setStage('result-confirm');
    } catch (err: any) {
      console.error('[Scanner Error]', err);
      setErrorMessage(err?.message || "We couldn't read this bill. You can enter the amount manually.");
      setStage('error');
    }
  };

  const handleConfirmResult = () => {
    const finalAmount = parseFloat(amountInput) || amount;
    if (finalAmount <= 0) {
      setErrorMessage('Please confirm or enter a valid amount greater than ₹0.');
      setIsEditingResult(true);
      return;
    }

    onScanComplete({
      merchant: merchant.trim() || 'Merchant Receipt',
      amount: finalAmount,
      date,
      originalImage: selectedImage,
      rawText,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Hidden file input for upload and mobile camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* STAGE 1: IDLE / ENTRY (Camera or Upload options + Big Manual Entry Button) */}
      {stage === 'idle' && (
        <div className="p-4 sm:p-6 space-y-5">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mx-auto mb-2.5 shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-zinc-950 tracking-tight">
              Scan Bill Receipt
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Take a photo or upload an image to automatically detect merchant, amount, and date.
            </p>
          </div>

          {/* Primary Action Buttons: Camera & Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={startCamera}
              className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1.5 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-900 bg-zinc-50/60 hover:bg-zinc-100 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-zinc-800 group-hover:scale-105 transition-transform shrink-0">
                <Camera className="w-5 h-5 text-zinc-900" />
              </div>
              <div className="text-left sm:text-center">
                <div className="text-sm font-bold text-zinc-900">Take Photo</div>
                <div className="text-[11px] text-zinc-500">Use device camera</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-1.5 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-900 bg-zinc-50/60 hover:bg-zinc-100 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-zinc-800 group-hover:scale-105 transition-transform shrink-0">
                <Upload className="w-5 h-5 text-zinc-900" />
              </div>
              <div className="text-left sm:text-center">
                <div className="text-sm font-bold text-zinc-900">Upload Image</div>
                <div className="text-[11px] text-zinc-500">JPEG, PNG, or WebP</div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="relative max-w-lg mx-auto flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              or
            </span>
          </div>

          {/* Large Prominent H2-Style Manual Entry Button */}
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={onEnterManually}
              className="w-full p-4 sm:p-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <PenLine className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Enter Bill Manually
                  </h2>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Type in the amount, merchant, and date directly
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 group-hover:translate-x-1 transition-transform shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Bottom Cancel Action */}
          <div className="pt-2 text-center border-t border-zinc-100">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: LIVE CAMERA VIEWFINDER */}
      {stage === 'camera-active' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[380px] w-full flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder frame overlay */}
            <div className="absolute inset-6 border-2 border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              </div>
              <div className="text-center text-white/80 text-xs font-semibold bg-black/40 py-1 px-3 rounded-full mx-auto backdrop-blur-xs">
                Position bill inside frame
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setStage('idle');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-950 text-white font-bold text-sm hover:bg-zinc-800 shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: OCR SCANNING ANIMATION (Prompt Section 7) */}
      {stage === 'scanning' && (
        <div className="p-6 sm:p-8 text-center space-y-5">
          {/* Subtle animated laser scanning effect over image */}
          <div className="relative w-48 h-60 mx-auto rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-inner flex items-center justify-center">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Scanning bill"
                className="w-full h-full object-cover opacity-60 filter blur-[0.5px]"
              />
            ) : (
              <FileText className="w-16 h-16 text-zinc-300" />
            )}

            {/* Laser Line Scanning Effect */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce duration-1000" />

            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-lg">
                <Loader2 className="w-6 h-6 text-zinc-900 animate-spin" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-zinc-900 tracking-tight">
              Scanning your bill...
            </h4>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {statusMessage}
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-xs mx-auto">
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <div
                className="h-full bg-zinc-900 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 font-mono">
              OCR Engine Processing · {progressPercent}%
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4: OCR RESULT CONFIRMATION (Prompt Section 10) */}
      {stage === 'result-confirm' && (
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-black text-zinc-950 tracking-tight">
                  Bill detected
                </h4>
                <p className="text-xs text-zinc-400">
                  Verify or adjust extracted details before splitting
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingResult(!isEditingResult)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>{isEditingResult ? 'Done Editing' : 'Edit'}</span>
            </button>
          </div>

          {/* Result Card Layout Matching Section 10 */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
            {/* Merchant */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Merchant
              </label>
              {isEditingResult ? (
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-900 bg-white"
                />
              ) : (
                <div className="text-base font-bold text-zinc-900 mt-0.5">
                  {merchant || "Fisherman's Wharf"}
                </div>
              )}
            </div>

            {/* Amount - Visual Focus */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Amount
              </label>
              {isEditingResult ? (
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-zinc-300 text-lg font-black text-zinc-950 bg-white"
                  />
                </div>
              ) : (
                <div className="text-3xl font-black text-zinc-950 tracking-tight mt-0.5">
                  {formatINR(Math.round((parseFloat(amountInput) || amount) * 100))}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Date
              </label>
              {isEditingResult ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-900 bg-white"
                />
              ) : (
                <div className="text-xs font-semibold text-zinc-600 mt-0.5">
                  {date}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStage('idle');
                setIsEditingResult(false);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rescan</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmResult}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-zinc-950 text-white font-bold text-xs sm:text-sm hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
            >
              <span>Continue to Split</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: ERROR / MANUAL FALLBACK (Prompt Section 11) */}
      {stage === 'error' && (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-zinc-900">
              We couldn't read this bill.
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              {errorMessage || 'You can enter the amount manually.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStage('idle')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
            >
              Try Another Image
            </button>
            <button
              type="button"
              onClick={onEnterManually}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer"
            >
              Enter Manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
