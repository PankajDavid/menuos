import { Router } from 'express';
import { getRestaurant, updateRestaurant, getAnalytics } from '../controllers/restaurant.controller.js';
import { getStaff, createStaff, toggleStaffStatus } from '../controllers/staff.controller.js';
import { getRestaurantLimits, checkLimit } from '../controllers/planLimits.controller.js';
import { getRestaurantFeatures, checkFeature } from '../controllers/featureFlags.controller.js';
import { getRestaurantOnboarding, completeOnboardingItem, uncompleteOnboardingItem } from '../controllers/onboarding.controller.js';
import { trackEngagement } from '../controllers/trialManagement.controller.js';
import { createReferralCode, getMyReferralCodes, getMyReferrals } from '../controllers/referralProgram.controller.js';
import { getRestaurantConversations, createConversation, getRestaurantConversation, sendRestaurantMessage } from '../controllers/messaging.controller.js';
import { authenticate, authorizeRole } from '../middleware/authenticate.js';
import { tenantResolver, requireTenantAccess } from '../middleware/tenantResolver.js';

const router = Router();

router.get('/:slug', tenantResolver, getRestaurant);
router.put('/:slug', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), updateRestaurant);
router.get('/:slug/analytics', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), getAnalytics);

// Staff management routes
router.get('/:slug/staff', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), getStaff);
router.post('/:slug/staff', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), createStaff);
router.patch('/:slug/staff/:userId/toggle', tenantResolver, authenticate, requireTenantAccess, authorizeRole('admin', 'platform_admin'), toggleStaffStatus);

// Plan limits routes
router.get('/:slug/limits', tenantResolver, authenticate, requireTenantAccess, getRestaurantLimits);
router.get('/:slug/limits/:resource', tenantResolver, authenticate, requireTenantAccess, checkLimit);

// Feature flags routes
router.get('/:slug/features', tenantResolver, authenticate, requireTenantAccess, getRestaurantFeatures);
router.get('/:slug/features/:featureKey', tenantResolver, authenticate, requireTenantAccess, checkFeature);

// Onboarding routes
router.get('/:slug/onboarding', tenantResolver, authenticate, requireTenantAccess, getRestaurantOnboarding);
router.post('/:slug/onboarding/:itemId/complete', tenantResolver, authenticate, requireTenantAccess, completeOnboardingItem);
router.post('/:slug/onboarding/:itemId/uncomplete', tenantResolver, authenticate, requireTenantAccess, uncompleteOnboardingItem);

// Trial engagement tracking
router.post('/:slug/trial/track', tenantResolver, authenticate, requireTenantAccess, trackEngagement);

// Referral routes
router.get('/:slug/referral-codes', tenantResolver, authenticate, requireTenantAccess, getMyReferralCodes);
router.post('/:slug/referral-codes', tenantResolver, authenticate, requireTenantAccess, createReferralCode);
router.get('/:slug/referrals', tenantResolver, authenticate, requireTenantAccess, getMyReferrals);

// Messaging routes
router.get('/:slug/conversations', tenantResolver, authenticate, requireTenantAccess, getRestaurantConversations);
router.post('/:slug/conversations', tenantResolver, authenticate, requireTenantAccess, createConversation);
router.get('/:slug/conversations/:id', tenantResolver, authenticate, requireTenantAccess, getRestaurantConversation);
router.post('/:slug/conversations/:id/messages', tenantResolver, authenticate, requireTenantAccess, sendRestaurantMessage);

export default router;
