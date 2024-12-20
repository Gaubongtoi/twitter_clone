import { ObjectId } from 'mongodb'
import databaseService from './database.services'

class ConservationServices {
  async getConservation({
    sender_id,
    receiver_id,
    limit,
    page
  }: {
    sender_id: string
    receiver_id: string
    limit: number
    page: number
  }) {
    const match = {
      $or: [
        {
          sender_id: new ObjectId(sender_id),
          receiver_id: new ObjectId(receiver_id)
        },
        {
          sender_id: new ObjectId(receiver_id),
          receiver_id: new ObjectId(sender_id)
        }
      ]
    }
    const conservations = await databaseService.conservations
      .find(match)
      .sort({ created_at: -1 })
      .skip(limit * (page - 1))
      .limit(limit)
      .toArray()
    const total = await databaseService.conservations.countDocuments(match)
    return {
      conservations,
      total
    }
  }
  async getReceivers({ user_id, page, limit }: { user_id: string; page: number; limit: number }) {
    const [receivers, total] = await Promise.all([
      databaseService.conservations
        .aggregate([
          {
            $match: {
              $or: [{ sender_id: new ObjectId(user_id) }, { receiver_id: new ObjectId(user_id) }]
            }
          },
          {
            $sort: { created_at: -1 } // Sắp xếp theo thời gian mới nhất trước
          },
          {
            $group: {
              _id: {
                conversationId: {
                  $cond: {
                    if: { $lt: ['$sender_id', '$receiver_id'] },
                    then: { sender: '$sender_id', receiver: '$receiver_id' },
                    else: { sender: '$receiver_id', receiver: '$sender_id' }
                  }
                }
              },
              latestMessage: { $first: '$$ROOT' } // Lấy tin nhắn mới nhất
            }
          },
          {
            $replaceRoot: { newRoot: '$latestMessage' } // Trả về tin nhắn mới nhất
          },
          {
            $addFields: {
              otherUserId: {
                $cond: {
                  if: { $eq: ['$sender_id', new ObjectId(user_id)] },
                  then: '$receiver_id',
                  else: '$sender_id'
                }
              }
            }
          },
          {
            $lookup: {
              from: 'users', // Giả sử collection người dùng là 'users'
              localField: 'otherUserId',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $unwind: '$userInfo' // Tách mảng kết quả lookup
          },
          {
            $project: {
              otherUserId: 0,
              userInfo: {
                password: 0,
                email_verify_token: 0,
                forgot_password_token: 0,
                date_of_birth: 0
              }
            }
          },
          {
            $skip: limit * (page - 1)
          },
          {
            $limit: limit
          }
        ])
        .toArray(),
      databaseService.conservations
        .aggregate([
          {
            $match: {
              $or: [{ sender_id: new ObjectId(user_id) }, { receiver_id: new ObjectId(user_id) }]
            }
          },
          {
            $sort: { created_at: -1 } // Sắp xếp theo thời gian mới nhất trước
          },
          {
            $group: {
              _id: {
                conversationId: {
                  $cond: {
                    if: { $lt: ['$sender_id', '$receiver_id'] },
                    then: { sender: '$sender_id', receiver: '$receiver_id' },
                    else: { sender: '$receiver_id', receiver: '$sender_id' }
                  }
                }
              },
              latestMessage: { $first: '$$ROOT' } // Lấy tin nhắn mới nhất
            }
          },
          {
            $replaceRoot: { newRoot: '$latestMessage' } // Trả về tin nhắn mới nhất
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])
    console.log('total: ', total)
    return {
      receivers,
      total: total[0]?.total || 0
    }
  }
}
const conservationService = new ConservationServices()
export default conservationService
