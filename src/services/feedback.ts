import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.ts';

interface FeedbackData {
  familyId: string;
  userRole: string;
  userName: string;
  category: string;
  message: string;
}

export function submitFeedback(data: FeedbackData): Promise<void> {
  return addDoc(
    collection(db, 'feedback'),
    Object.assign({}, data, {
      createdAt: serverTimestamp(),
      status: 'new',
      userAgent: navigator.userAgent,
    })
  ).then(function () {
    return;
  });
}
